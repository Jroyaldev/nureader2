import { useState, useRef, useCallback, useEffect } from 'react';

interface GestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: (x: number, y: number) => void;
  onTap?: (x: number, y: number) => void;
  threshold?: number;
  longPressDelay?: number;
  preventScroll?: boolean;
  enabled?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export const useGestures = (config: GestureConfig) => {
  const [touchStart, setTouchStart] = useState<TouchPoint | null>(null);
  const [lastTap, setLastTap] = useState<number>(0);
  const touchStartRef = useRef<TouchPoint | null>(null);
  const initialDistanceRef = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isPinching = useRef<boolean>(false);
  const lastPinchScale = useRef<number>(1);
  
  const threshold = config.threshold || 50;
  const doubleTapDelay = 300; // ms
  const longPressDelay = config.longPressDelay || 500;

  // Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Haptic feedback helper
  const triggerHapticFeedback = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([5]); // Light haptic feedback
    }
  }, []);
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!config.enabled !== false) {
      const touch = e.touches[0];
      const touchPoint: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      };
      
      setTouchStart(touchPoint);
      touchStartRef.current = touchPoint;
      clearLongPressTimer();
      isPinching.current = false;
      
      // Handle pinch gestures
      if (e.touches.length === 2 && config.onPinch) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistanceRef.current = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        isPinching.current = true;
        config.onPinchStart?.();
      } else if (e.touches.length === 1) {
        // Start long press timer for single touch
        if (config.onLongPress) {
          longPressTimer.current = setTimeout(() => {
            config.onLongPress!(touch.clientX, touch.clientY);
            triggerHapticFeedback();
          }, longPressDelay);
        }
      }
      
      // Handle double tap
      if (config.onDoubleTap) {
        const now = Date.now();
        if (now - lastTap < doubleTapDelay) {
          config.onDoubleTap();
          setLastTap(0); // Reset to prevent triple tap
          clearLongPressTimer(); // Cancel long press on double tap
        } else {
          setLastTap(now);
        }
      }

      // Prevent scrolling if requested
      if (config.preventScroll) {
        e.preventDefault();
      }
    }
  }, [config, lastTap, threshold, doubleTapDelay, longPressDelay, clearLongPressTimer, triggerHapticFeedback]);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!config.enabled !== false) {
      // Clear long press timer on any movement
      clearLongPressTimer();

      if (e.touches.length === 2 && config.onPinch && isPinching.current) {
        // Handle pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        if (initialDistanceRef.current > 0) {
          const scale = currentDistance / initialDistanceRef.current;
          
          // Only trigger if scale change is significant to reduce noise
          if (Math.abs(scale - lastPinchScale.current) > 0.01) {
            config.onPinch(scale);
            lastPinchScale.current = scale;
          }
        }
      }

      // Prevent scrolling during gestures if requested
      if (config.preventScroll) {
        e.preventDefault();
      }
    }
  }, [config, clearLongPressTimer]);
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!config.enabled !== false) {
      clearLongPressTimer();

      // Handle pinch end
      if (isPinching.current) {
        isPinching.current = false;
        lastPinchScale.current = 1;
        config.onPinchEnd?.();
        initialDistanceRef.current = 0;
        return;
      }

      if (touchStartRef.current && e.changedTouches.length > 0) {
        const touchEnd = e.changedTouches[0];
        const touchStart = touchStartRef.current;
        
        const deltaX = touchEnd.clientX - touchStart.x;
        const deltaY = touchEnd.clientY - touchStart.y;
        const deltaTime = Date.now() - touchStart.timestamp;
        
        // Calculate velocity for better gesture detection
        const velocity = {
          x: Math.abs(deltaX) / deltaTime,
          y: Math.abs(deltaY) / deltaTime
        };

        const isQuickGesture = velocity.x > 0.5 || velocity.y > 0.5;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Check for tap (minimal movement, quick timing)
        if (absDeltaX < 10 && absDeltaY < 10 && deltaTime < 200 && config.onTap) {
          config.onTap(touchEnd.clientX, touchEnd.clientY);
        }
        // Check for swipe gestures (either distance threshold or quick gesture)
        else if ((deltaTime < 500 && (absDeltaX > threshold || absDeltaY > threshold)) || isQuickGesture) {
          // Determine if it's a horizontal or vertical swipe
          if (absDeltaX > absDeltaY && (absDeltaX > threshold || velocity.x > 0.5)) {
            // Horizontal swipe
            if (deltaX > 0) {
              config.onSwipeRight?.();
            } else {
              config.onSwipeLeft?.();
            }
            triggerHapticFeedback();
          } else if (absDeltaY > threshold || velocity.y > 0.5) {
            // Vertical swipe
            if (deltaY > 0) {
              config.onSwipeDown?.();
            } else {
              config.onSwipeUp?.();
            }
            triggerHapticFeedback();
          }
        }
      }
      
      // Reset refs
      touchStartRef.current = null;
      initialDistanceRef.current = 0;
    }
  }, [config, threshold, clearLongPressTimer, triggerHapticFeedback]);

  // Handle touch cancel (when interrupted by system gestures)
  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer();
    isPinching.current = false;
    lastPinchScale.current = 1;
    touchStartRef.current = null;
    initialDistanceRef.current = 0;
  }, [clearLongPressTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);
  
  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    
    // Style properties for gesture optimization
    style: {
      touchAction: config.preventScroll ? 'none' : 'auto',
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      WebkitTouchCallout: 'none' as const,
    } as React.CSSProperties
  };
};

// Helper hook for simple swipe detection
export const useSwipe = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50
) => {
  return useGestures({
    onSwipeLeft,
    onSwipeRight,
    threshold,
  });
};