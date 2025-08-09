/**
 * Drawer Component
 * 
 * Mobile-optimized drawer with gesture support, backdrop blur, and smooth animations.
 * Supports multiple positions and sizes with touch-friendly interactions.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// ===== DRAWER COMPONENT =====

export interface DrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the drawer is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Drawer position */
  position?: 'left' | 'right' | 'top' | 'bottom';
  /** Drawer size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Custom width/height (overrides size) */
  customSize?: string;
  /** Show backdrop */
  showBackdrop?: boolean;
  /** Backdrop blur effect */
  backdropBlur?: boolean;
  /** Close on backdrop click */
  closeOnBackdropClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Enable gesture support */
  enableGestures?: boolean;
  /** Gesture threshold (0-1) */
  gestureThreshold?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Prevent body scroll when open */
  preventBodyScroll?: boolean;
  /** Safe area padding */
  safeArea?: boolean;
  /** Drawer content */
  children: React.ReactNode;
}

const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
  ({ 
    className,
    open,
    onClose,
    position = 'left',
    size = 'md',
    customSize,
    showBackdrop = true,
    backdropBlur = true,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    enableGestures = true,
    gestureThreshold = 0.3,
    animationDuration = 300,
    preventBodyScroll = true,
    safeArea = true,
    children,
    ...props 
  }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const drawerRef = useRef<HTMLDivElement>(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const currentPosRef = useRef({ x: 0, y: 0 });

    // Handle open/close state
    useEffect(() => {
      if (open) {
        setIsVisible(true);
        if (preventBodyScroll) {
          document.body.style.overflow = 'hidden';
        }
      } else {
        const timer = setTimeout(() => {
          setIsVisible(false);
          if (preventBodyScroll) {
            document.body.style.overflow = '';
          }
        }, animationDuration);
        return () => clearTimeout(timer);
      }
    }, [open, animationDuration, preventBodyScroll]);

    // Handle escape key
    useEffect(() => {
      if (!closeOnEscape || !open) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [closeOnEscape, open, onClose]);

    // Get size classes and styles
    const getSizeClasses = () => {
      if (customSize) {
        return ''; // Return empty string for classes when using custom size
      }

      const sizeMap = {
        sm: position === 'left' || position === 'right' ? 'w-64' : 'h-64',
        md: position === 'left' || position === 'right' ? 'w-80' : 'h-80',
        lg: position === 'left' || position === 'right' ? 'w-96' : 'h-96',
        xl: position === 'left' || position === 'right' ? 'w-[28rem]' : 'h-[28rem]',
        full: position === 'left' || position === 'right' ? 'w-full' : 'h-full',
      };

      return sizeMap[size];
    };

    // Get custom size styles
    const getCustomSizeStyles = () => {
      if (customSize) {
        return position === 'left' || position === 'right' 
          ? { width: customSize }
          : { height: customSize };
      }
      return {};
    };

    // Get position classes
    const getPositionClasses = () => {
      const baseClasses = 'fixed bg-background border-border shadow-2xl';
      
      const positionMap = {
        left: `${baseClasses} left-0 top-0 bottom-0 border-r`,
        right: `${baseClasses} right-0 top-0 bottom-0 border-l`,
        top: `${baseClasses} top-0 left-0 right-0 border-b`,
        bottom: `${baseClasses} bottom-0 left-0 right-0 border-t`,
      };

      return positionMap[position];
    };

    // Get animation classes
    const getAnimationClasses = () => {
      if (isDragging) return '';

      const animationMap = {
        left: open ? 'animate-in slide-in-from-left' : 'animate-out slide-out-to-left',
        right: open ? 'animate-in slide-in-from-right' : 'animate-out slide-out-to-right',
        top: open ? 'animate-in slide-in-from-top' : 'animate-out slide-out-to-top',
        bottom: open ? 'animate-in slide-in-from-bottom' : 'animate-out slide-out-to-bottom',
      };

      return `${animationMap[position]} duration-${animationDuration}`;
    };

    // Touch/mouse event handlers for gestures
    const handleStart = (clientX: number, clientY: number) => {
      if (!enableGestures) return;
      
      setIsDragging(true);
      startPosRef.current = { x: clientX, y: clientY };
      currentPosRef.current = { x: clientX, y: clientY };
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging || !enableGestures) return;

      currentPosRef.current = { x: clientX, y: clientY };
      
      const deltaX = clientX - startPosRef.current.x;
      const deltaY = clientY - startPosRef.current.y;
      
      let offset = 0;
      
      switch (position) {
        case 'left':
          offset = Math.min(0, deltaX);
          break;
        case 'right':
          offset = Math.max(0, deltaX);
          break;
        case 'top':
          offset = Math.min(0, deltaY);
          break;
        case 'bottom':
          offset = Math.max(0, deltaY);
          break;
      }
      
      setDragOffset(offset);
    };

    const handleEnd = () => {
      if (!isDragging || !enableGestures) return;

      const deltaX = currentPosRef.current.x - startPosRef.current.x;
      const deltaY = currentPosRef.current.y - startPosRef.current.y;
      
      let shouldClose = false;
      const drawerSize = drawerRef.current?.getBoundingClientRect();
      
      if (drawerSize) {
        switch (position) {
          case 'left':
            shouldClose = Math.abs(deltaX) > drawerSize.width * gestureThreshold && deltaX < 0;
            break;
          case 'right':
            shouldClose = Math.abs(deltaX) > drawerSize.width * gestureThreshold && deltaX > 0;
            break;
          case 'top':
            shouldClose = Math.abs(deltaY) > drawerSize.height * gestureThreshold && deltaY < 0;
            break;
          case 'bottom':
            shouldClose = Math.abs(deltaY) > drawerSize.height * gestureThreshold && deltaY > 0;
            break;
        }
      }
      
      setIsDragging(false);
      setDragOffset(0);
      
      if (shouldClose) {
        onClose();
      }
    };

    // Touch event handlers
    const handleTouchStart = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      handleEnd();
    };

    // Mouse event handlers
    const handleMouseDown = (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleEnd();
    };

    // Backdrop click handler
    const handleBackdropClick = (e: React.MouseEvent) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    };

    // Get transform style for dragging
    const getTransformStyle = () => {
      if (!isDragging || dragOffset === 0) return {};

      switch (position) {
        case 'left':
        case 'right':
          return { transform: `translateX(${dragOffset}px)` };
        case 'top':
        case 'bottom':
          return { transform: `translateY(${dragOffset}px)` };
        default:
          return {};
      }
    };

    if (!isVisible) return null;

    const drawerContent = (
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        {showBackdrop && (
          <div
            className={cn(
              'fixed inset-0 bg-black/50',
              backdropBlur && 'backdrop-blur-sm',
              open ? 'animate-in fade-in' : 'animate-out fade-out',
              `duration-${animationDuration}`
            )}
            onClick={handleBackdropClick}
          />
        )}

        {/* Drawer */}
        <div
          ref={drawerRef}
          className={cn(
            getPositionClasses(),
            getSizeClasses(),
            getAnimationClasses(),
            safeArea && [
              position === 'left' && 'pt-safe-area-inset-top',
              position === 'right' && 'pt-safe-area-inset-top',
              position === 'top' && 'pt-safe-area-inset-top',
              position === 'bottom' && 'pb-safe-area-inset-bottom',
            ],
            'z-50 overflow-hidden',
            className
          )}
          style={{ ...getCustomSizeStyles(), ...getTransformStyle() }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={isDragging ? handleMouseMove : undefined}
          onMouseUp={isDragging ? handleMouseUp : undefined}
          {...props}
        >
          {/* Drag handle (visual indicator) */}
          {enableGestures && (
            <div className={cn(
              'absolute bg-muted-foreground/30 rounded-full',
              position === 'left' && 'right-1 top-1/2 -translate-y-1/2 w-1 h-12',
              position === 'right' && 'left-1 top-1/2 -translate-y-1/2 w-1 h-12',
              position === 'top' && 'bottom-1 left-1/2 -translate-x-1/2 h-1 w-12',
              position === 'bottom' && 'top-1 left-1/2 -translate-x-1/2 h-1 w-12',
            )} />
          )}

          {/* Content */}
          <div className="h-full overflow-auto">
            {children}
          </div>
        </div>
      </div>
    );

    return createPortal(drawerContent, document.body);
  }
);

Drawer.displayName = 'Drawer';

export { Drawer };