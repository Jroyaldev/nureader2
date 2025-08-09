/**
 * PinchZoom Component
 * 
 * Touch-optimized pinch-to-zoom component for text scaling and content zooming.
 * Supports both touch gestures and mouse wheel for cross-platform compatibility.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ===== PINCH ZOOM COMPONENT =====

export interface PinchZoomProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Initial zoom level */
  initialZoom?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Zoom step for mouse wheel */
  zoomStep?: number;
  /** Enable mouse wheel zooming */
  enableWheel?: boolean;
  /** Enable double tap to zoom */
  enableDoubleTap?: boolean;
  /** Double tap zoom level */
  doubleTapZoom?: number;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Center zoom on double tap */
  centerOnDoubleTap?: boolean;
  /** Constrain to container bounds */
  constrainToBounds?: boolean;
  /** Zoom change callback */
  onZoomChange?: (zoom: number) => void;
  /** Pan change callback */
  onPanChange?: (x: number, y: number) => void;
  /** Content to zoom */
  children: React.ReactNode;
}

interface TouchState {
  touches: Array<{ x: number; y: number; id: number }>;
  initialDistance: number;
  initialZoom: number;
  initialPan: { x: number; y: number };
  center: { x: number; y: number };
}

interface Transform {
  zoom: number;
  pan: { x: number; y: number };
}

const PinchZoom = React.forwardRef<HTMLDivElement, PinchZoomProps>(
  ({ 
    className,
    initialZoom = 1,
    minZoom = 0.5,
    maxZoom = 3,
    zoomStep = 0.1,
    enableWheel = true,
    enableDoubleTap = true,
    doubleTapZoom = 2,
    animationDuration = 300,
    centerOnDoubleTap = true,
    constrainToBounds = true,
    onZoomChange,
    onPanChange,
    children,
    ...props 
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const touchStateRef = useRef<TouchState | null>(null);
    const lastTapRef = useRef<number>(0);
    const animationRef = useRef<number | null>(null);

    const [transform, setTransform] = useState<Transform>({
      zoom: initialZoom,
      pan: { x: 0, y: 0 },
    });

    const [isAnimating, setIsAnimating] = useState(false);

    // Calculate distance between two touches
    const calculateDistance = useCallback((touch1: { x: number; y: number }, touch2: { x: number; y: number }) => {
      return Math.sqrt(
        Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2)
      );
    }, []);

    // Calculate center point between touches
    const calculateCenter = useCallback((touches: Array<{ x: number; y: number }>) => {
      if (touches.length === 0) return { x: 0, y: 0 };
      
      const sum = touches.reduce(
        (acc, touch) => ({ x: acc.x + touch.x, y: acc.y + touch.y }),
        { x: 0, y: 0 }
      );
      
      return {
        x: sum.x / touches.length,
        y: sum.y / touches.length,
      };
    }, []);

    // Constrain zoom to bounds
    const constrainZoom = useCallback((zoom: number) => {
      return Math.max(minZoom, Math.min(maxZoom, zoom));
    }, [minZoom, maxZoom]);

    // Constrain pan to bounds
    const constrainPan = useCallback((pan: { x: number; y: number }, zoom: number) => {
      if (!constrainToBounds || !containerRef.current || !contentRef.current) {
        return pan;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();
      
      const scaledWidth = contentRect.width * zoom;
      const scaledHeight = contentRect.height * zoom;
      
      const maxPanX = Math.max(0, (scaledWidth - containerRect.width) / 2);
      const maxPanY = Math.max(0, (scaledHeight - containerRect.height) / 2);
      
      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, pan.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, pan.y)),
      };
    }, [constrainToBounds]);

    // Apply transform with constraints
    const applyTransform = useCallback((newTransform: Partial<Transform>, animate = false) => {
      const zoom = constrainZoom(newTransform.zoom ?? transform.zoom);
      const pan = constrainPan(
        newTransform.pan ?? transform.pan,
        zoom
      );

      const finalTransform = { zoom, pan };

      if (animate) {
        setIsAnimating(true);
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }

        const startTransform = transform;
        const startTime = Date.now();

        const animateStep = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / animationDuration, 1);
          
          // Easing function (ease-out)
          const eased = 1 - Math.pow(1 - progress, 3);
          
          const currentTransform = {
            zoom: startTransform.zoom + (finalTransform.zoom - startTransform.zoom) * eased,
            pan: {
              x: startTransform.pan.x + (finalTransform.pan.x - startTransform.pan.x) * eased,
              y: startTransform.pan.y + (finalTransform.pan.y - startTransform.pan.y) * eased,
            },
          };

          setTransform(currentTransform);

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animateStep);
          } else {
            setIsAnimating(false);
            animationRef.current = null;
          }
        };

        animationRef.current = requestAnimationFrame(animateStep);
      } else {
        setTransform(finalTransform);
      }

      // Call callbacks
      if (newTransform.zoom !== undefined && onZoomChange) {
        onZoomChange(zoom);
      }
      if (newTransform.pan !== undefined && onPanChange) {
        onPanChange(pan.x, pan.y);
      }
    }, [transform, constrainZoom, constrainPan, animationDuration, onZoomChange, onPanChange]);

    // Touch event handlers
    const handleTouchStart = useCallback((event: React.TouchEvent) => {
      const touches = Array.from(event.touches).map(touch => ({
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier,
      }));

      if (touches.length === 2) {
        // Pinch gesture
        const distance = calculateDistance(touches[0], touches[1]);
        const center = calculateCenter(touches);

        touchStateRef.current = {
          touches,
          initialDistance: distance,
          initialZoom: transform.zoom,
          initialPan: { ...transform.pan },
          center,
        };
      } else if (touches.length === 1 && enableDoubleTap) {
        // Double tap detection
        const now = Date.now();
        const timeDiff = now - lastTapRef.current;
        
        if (timeDiff < 300) {
          // Double tap detected
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (containerRect) {
            const tapX = touches[0].x - containerRect.left;
            const tapY = touches[0].y - containerRect.top;
            
            if (transform.zoom > initialZoom) {
              // Zoom out to initial
              applyTransform({
                zoom: initialZoom,
                pan: { x: 0, y: 0 },
              }, true);
            } else {
              // Zoom in
              let newPan = { x: 0, y: 0 };
              
              if (centerOnDoubleTap) {
                // Center on tap point
                const centerX = containerRect.width / 2;
                const centerY = containerRect.height / 2;
                newPan = {
                  x: (centerX - tapX) * (doubleTapZoom - 1),
                  y: (centerY - tapY) * (doubleTapZoom - 1),
                };
              }
              
              applyTransform({
                zoom: doubleTapZoom,
                pan: newPan,
              }, true);
            }
          }
        }
        
        lastTapRef.current = now;
      }
    }, [transform, calculateDistance, calculateCenter, enableDoubleTap, initialZoom, doubleTapZoom, centerOnDoubleTap, applyTransform]);

    const handleTouchMove = useCallback((event: React.TouchEvent) => {
      event.preventDefault();
      
      const touches = Array.from(event.touches).map(touch => ({
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier,
      }));

      const touchState = touchStateRef.current;
      
      if (touches.length === 2 && touchState) {
        // Pinch zoom
        const distance = calculateDistance(touches[0], touches[1]);
        const scale = distance / touchState.initialDistance;
        const newZoom = touchState.initialZoom * scale;
        
        // Calculate pan adjustment to keep zoom centered
        const center = calculateCenter(touches);
        const panAdjustment = {
          x: (center.x - touchState.center.x) * 0.5,
          y: (center.y - touchState.center.y) * 0.5,
        };
        
        applyTransform({
          zoom: newZoom,
          pan: {
            x: touchState.initialPan.x + panAdjustment.x,
            y: touchState.initialPan.y + panAdjustment.y,
          },
        });
      } else if (touches.length === 1 && transform.zoom > 1) {
        // Single finger pan (only when zoomed in)
        const touch = touches[0];
        const lastTouch = touchStateRef.current?.touches[0];
        
        if (lastTouch) {
          const deltaX = touch.x - lastTouch.x;
          const deltaY = touch.y - lastTouch.y;
          
          applyTransform({
            pan: {
              x: transform.pan.x + deltaX,
              y: transform.pan.y + deltaY,
            },
          });
        }
        
        touchStateRef.current = {
          touches,
          initialDistance: 0,
          initialZoom: transform.zoom,
          initialPan: { ...transform.pan },
          center: { x: 0, y: 0 },
        };
      }
    }, [transform, calculateDistance, calculateCenter, applyTransform]);

    const handleTouchEnd = useCallback(() => {
      touchStateRef.current = null;
    }, []);

    // Mouse wheel handler
    const handleWheel = useCallback((event: React.WheelEvent) => {
      if (!enableWheel) return;
      
      event.preventDefault();
      
      const delta = event.deltaY > 0 ? -zoomStep : zoomStep;
      const newZoom = transform.zoom + delta;
      
      // Zoom towards mouse position
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const mouseX = event.clientX - containerRect.left;
        const mouseY = event.clientY - containerRect.top;
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        
        const panAdjustment = {
          x: (centerX - mouseX) * (newZoom - transform.zoom) * 0.1,
          y: (centerY - mouseY) * (newZoom - transform.zoom) * 0.1,
        };
        
        applyTransform({
          zoom: newZoom,
          pan: {
            x: transform.pan.x + panAdjustment.x,
            y: transform.pan.y + panAdjustment.y,
          },
        });
      }
    }, [enableWheel, zoomStep, transform, applyTransform]);

    // Cleanup animation on unmount
    useEffect(() => {
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, []);

    // Reset transform when initialZoom changes
    useEffect(() => {
      if (transform.zoom === 1 && initialZoom !== 1) {
        setTransform({
          zoom: initialZoom,
          pan: { x: 0, y: 0 },
        });
      }
    }, [initialZoom, transform.zoom]);

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden touch-none select-none',
          'w-full h-full',
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        {...props}
      >
        <div
          ref={contentRef}
          className={cn(
            'origin-center transition-transform',
            isAnimating && `duration-${animationDuration}`,
            !isAnimating && 'duration-0'
          )}
          style={{
            transform: `scale(${transform.zoom}) translate(${transform.pan.x}px, ${transform.pan.y}px)`,
            transformOrigin: 'center center',
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);

PinchZoom.displayName = 'PinchZoom';

export { PinchZoom };