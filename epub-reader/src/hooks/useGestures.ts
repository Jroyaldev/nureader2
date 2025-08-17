import { useState, useRef, useCallback } from 'react';

interface GestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onDoubleTap?: () => void;
  threshold?: number;
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
  
  const threshold = config.threshold || 50;
  const doubleTapDelay = 300; // ms
  
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
      
      // Handle pinch gestures
      if (e.touches.length === 2 && config.onPinch) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistanceRef.current = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
      }
      
      // Handle double tap
      if (config.onDoubleTap) {
        const now = Date.now();
        if (now - lastTap < doubleTapDelay) {
          config.onDoubleTap();
          setLastTap(0); // Reset to prevent triple tap
        } else {
          setLastTap(now);
        }
      }
    }
  }, [config, lastTap, threshold, doubleTapDelay]);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!config.enabled !== false && e.touches.length === 2 && config.onPinch) {
      // Handle pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (initialDistanceRef.current > 0) {
        const scale = currentDistance / initialDistanceRef.current;
        config.onPinch(scale);
      }
    }
  }, [config]);
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!config.enabled !== false && touchStartRef.current && e.changedTouches.length > 0) {
      const touchEnd = e.changedTouches[0];
      const touchStart = touchStartRef.current;
      
      const deltaX = touchEnd.clientX - touchStart.x;
      const deltaY = touchEnd.clientY - touchStart.y;
      const deltaTime = Date.now() - touchStart.timestamp;
      
      // Only process gestures that are quick enough (not slow drags)
      if (deltaTime < 500) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Determine if it's a horizontal or vertical swipe
        if (absDeltaX > absDeltaY && absDeltaX > threshold) {
          // Horizontal swipe
          if (deltaX > 0) {
            config.onSwipeRight?.();
          } else {
            config.onSwipeLeft?.();
          }
        } else if (absDeltaY > threshold) {
          // Vertical swipe
          if (deltaY > 0) {
            config.onSwipeDown?.();
          } else {
            config.onSwipeUp?.();
          }
        }
      }
      
      // Reset refs
      touchStartRef.current = null;
      initialDistanceRef.current = 0;
    }
  }, [config, threshold]);
  
  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
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