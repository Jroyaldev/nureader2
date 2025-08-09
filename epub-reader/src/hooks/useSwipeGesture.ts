/**
 * SwipeGesture Hook
 * 
 * Custom hook for detecting swipe gestures with configurable thresholds and directions.
 * Supports both touch and mouse events for cross-platform compatibility.
 */

import { useRef, useCallback, useEffect } from 'react';

export interface SwipeGestureConfig {
  /** Minimum distance in pixels to trigger a swipe */
  threshold?: number;
  /** Minimum velocity in pixels per millisecond */
  velocityThreshold?: number;
  /** Maximum time in milliseconds for a swipe */
  maxTime?: number;
  /** Prevent default touch behavior */
  preventDefault?: boolean;
  /** Enable mouse events for desktop testing */
  enableMouse?: boolean;
}

export interface SwipeGestureHandlers {
  /** Called when a swipe left is detected */
  onSwipeLeft?: (event: TouchEvent | MouseEvent, details: SwipeDetails) => void;
  /** Called when a swipe right is detected */
  onSwipeRight?: (event: TouchEvent | MouseEvent, details: SwipeDetails) => void;
  /** Called when a swipe up is detected */
  onSwipeUp?: (event: TouchEvent | MouseEvent, details: SwipeDetails) => void;
  /** Called when a swipe down is detected */
  onSwipeDown?: (event: TouchEvent | MouseEvent, details: SwipeDetails) => void;
  /** Called when any swipe is detected */
  onSwipe?: (direction: SwipeDirection, event: TouchEvent | MouseEvent, details: SwipeDetails) => void;
  /** Called when swipe starts */
  onSwipeStart?: (event: TouchEvent | MouseEvent) => void;
  /** Called when swipe ends (regardless of whether it triggered a swipe) */
  onSwipeEnd?: (event: TouchEvent | MouseEvent) => void;
}

export interface SwipeDetails {
  /** Distance of the swipe in pixels */
  distance: number;
  /** Velocity of the swipe in pixels per millisecond */
  velocity: number;
  /** Duration of the swipe in milliseconds */
  duration: number;
  /** Starting position */
  startPosition: { x: number; y: number };
  /** Ending position */
  endPosition: { x: number; y: number };
  /** Delta values */
  delta: { x: number; y: number };
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  isTracking: boolean;
  isMouse: boolean;
}

const defaultConfig: Required<SwipeGestureConfig> = {
  threshold: 50,
  velocityThreshold: 0.3,
  maxTime: 1000,
  preventDefault: true,
  enableMouse: false,
};

export function useSwipeGesture(
  handlers: SwipeGestureHandlers,
  config: SwipeGestureConfig = {}
) {
  const configRef = useRef({ ...defaultConfig, ...config });
  const handlersRef = useRef(handlers);
  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isTracking: false,
    isMouse: false,
  });

  // Update refs when props change
  useEffect(() => {
    configRef.current = { ...defaultConfig, ...config };
    handlersRef.current = handlers;
  });

  const getEventPosition = useCallback((event: TouchEvent | MouseEvent) => {
    if ('touches' in event) {
      const touch = event.touches[0] || event.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    } else {
      return { x: event.clientX, y: event.clientY };
    }
  }, []);

  const calculateSwipeDetails = useCallback((
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    startTime: number,
    endTime: number
  ): SwipeDetails => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = endTime - startTime;
    const velocity = duration > 0 ? distance / duration : 0;

    return {
      distance,
      velocity,
      duration,
      startPosition: { x: startX, y: startY },
      endPosition: { x: endX, y: endY },
      delta: { x: deltaX, y: deltaY },
    };
  }, []);

  const determineSwipeDirection = useCallback((deltaX: number, deltaY: number): SwipeDirection | null => {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Determine if horizontal or vertical swipe
    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }, []);

  const handleStart = useCallback((event: TouchEvent | MouseEvent) => {
    const { x, y } = getEventPosition(event);
    const isMouse = !('touches' in event);

    stateRef.current = {
      startX: x,
      startY: y,
      startTime: Date.now(),
      isTracking: true,
      isMouse,
    };

    if (configRef.current.preventDefault) {
      event.preventDefault();
    }

    handlersRef.current.onSwipeStart?.(event);
  }, [getEventPosition]);

  const handleEnd = useCallback((event: TouchEvent | MouseEvent) => {
    const state = stateRef.current;
    
    if (!state.isTracking) return;

    const { x, y } = getEventPosition(event);
    const endTime = Date.now();
    const config = configRef.current;

    const deltaX = x - state.startX;
    const deltaY = y - state.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = endTime - state.startTime;
    const velocity = duration > 0 ? distance / duration : 0;

    // Reset tracking state
    stateRef.current.isTracking = false;

    // Check if swipe meets criteria
    const meetsThreshold = distance >= config.threshold;
    const meetsVelocity = velocity >= config.velocityThreshold;
    const withinTimeLimit = duration <= config.maxTime;

    if (meetsThreshold && meetsVelocity && withinTimeLimit) {
      const direction = determineSwipeDirection(deltaX, deltaY);
      
      if (direction) {
        const details = calculateSwipeDetails(
          state.startX,
          state.startY,
          x,
          y,
          state.startTime,
          endTime
        );

        // Call specific direction handler
        switch (direction) {
          case 'left':
            handlersRef.current.onSwipeLeft?.(event, details);
            break;
          case 'right':
            handlersRef.current.onSwipeRight?.(event, details);
            break;
          case 'up':
            handlersRef.current.onSwipeUp?.(event, details);
            break;
          case 'down':
            handlersRef.current.onSwipeDown?.(event, details);
            break;
        }

        // Call general swipe handler
        handlersRef.current.onSwipe?.(direction, event, details);
      }
    }

    handlersRef.current.onSwipeEnd?.(event);
  }, [getEventPosition, determineSwipeDirection, calculateSwipeDetails]);

  const handleMove = useCallback((event: TouchEvent | MouseEvent) => {
    if (configRef.current.preventDefault && stateRef.current.isTracking) {
      event.preventDefault();
    }
  }, []);

  // Event handlers for touch events
  const touchHandlers = {
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onTouchMove: handleMove,
  };

  // Event handlers for mouse events (if enabled)
  const mouseHandlers = configRef.current.enableMouse ? {
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onMouseMove: handleMove,
  } : {};

  return {
    ...touchHandlers,
    ...mouseHandlers,
  };
}