/**
 * LongPress Hook
 * 
 * Custom hook for detecting long press gestures with haptic feedback support.
 * Works with both touch and mouse events for cross-platform compatibility.
 */

import { useRef, useCallback, useEffect } from 'react';

export interface LongPressConfig {
  /** Duration in milliseconds to trigger long press */
  duration?: number;
  /** Threshold in pixels for movement tolerance */
  threshold?: number;
  /** Enable haptic feedback (if supported) */
  enableHaptics?: boolean;
  /** Haptic feedback type */
  hapticType?: 'light' | 'medium' | 'heavy';
  /** Prevent default behavior */
  preventDefault?: boolean;
  /** Enable mouse events for desktop testing */
  enableMouse?: boolean;
  /** Cancel on pointer leave */
  cancelOnLeave?: boolean;
}

export interface LongPressHandlers {
  /** Called when long press is triggered */
  onLongPress?: (event: TouchEvent | MouseEvent, details: LongPressDetails) => void;
  /** Called when long press starts (after duration) */
  onLongPressStart?: (event: TouchEvent | MouseEvent) => void;
  /** Called when long press ends */
  onLongPressEnd?: (event: TouchEvent | MouseEvent) => void;
  /** Called when long press is cancelled */
  onLongPressCancel?: (event: TouchEvent | MouseEvent) => void;
  /** Called on regular click/tap (when long press doesn't trigger) */
  onClick?: (event: TouchEvent | MouseEvent) => void;
}

export interface LongPressDetails {
  /** Duration of the press in milliseconds */
  duration: number;
  /** Starting position */
  startPosition: { x: number; y: number };
  /** Current position */
  currentPosition: { x: number; y: number };
  /** Movement distance from start */
  distance: number;
}

interface LongPressState {
  startX: number;
  startY: number;
  startTime: number;
  isPressed: boolean;
  isLongPress: boolean;
  timeoutId: number | null;
  isMouse: boolean;
}

const defaultConfig: Required<LongPressConfig> = {
  duration: 500,
  threshold: 10,
  enableHaptics: true,
  hapticType: 'medium',
  preventDefault: true,
  enableMouse: false,
  cancelOnLeave: true,
};

// Haptic feedback function
const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(patterns[type]);
  }
  
  // For iOS devices with haptic feedback API
  if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
    try {
      // @ts-ignore - iOS specific API
      if (window.DeviceMotionEvent && window.DeviceMotionEvent.requestPermission) {
        // @ts-ignore
        if (window.ImpactFeedbackGenerator) {
          const impact = new window.ImpactFeedbackGenerator();
          if (impact && impact.impactOccurred) {
            impact.impactOccurred(type === 'light' ? 0 : type === 'medium' ? 1 : 2);
          }
        }
      }
    } catch (error) {
      // Haptic feedback not supported
    }
  }
};

export function useLongPress(
  handlers: LongPressHandlers,
  config: LongPressConfig = {}
) {
  const configRef = useRef({ ...defaultConfig, ...config });
  const handlersRef = useRef(handlers);
  const stateRef = useRef<LongPressState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isPressed: false,
    isLongPress: false,
    timeoutId: null,
    isMouse: false,
  });

  // Update refs when props change
  useEffect(() => {
    configRef.current = { ...defaultConfig, ...config };
    handlersRef.current = handlers;
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (stateRef.current.timeoutId) {
        clearTimeout(stateRef.current.timeoutId);
      }
    };
  }, []);

  const getEventPosition = useCallback((event: TouchEvent | MouseEvent) => {
    if ('touches' in event) {
      const touch = event.touches[0] || event.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    } else {
      return { x: event.clientX, y: event.clientY };
    }
  }, []);

  const calculateDistance = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }, []);

  const clearLongPressTimeout = useCallback(() => {
    if (stateRef.current.timeoutId) {
      clearTimeout(stateRef.current.timeoutId);
      stateRef.current.timeoutId = null;
    }
  }, []);

  const handleStart = useCallback((event: TouchEvent | MouseEvent) => {
    const { x, y } = getEventPosition(event);
    const isMouse = !('touches' in event);
    const config = configRef.current;

    // Clear any existing timeout
    clearLongPressTimeout();

    stateRef.current = {
      startX: x,
      startY: y,
      startTime: Date.now(),
      isPressed: true,
      isLongPress: false,
      timeoutId: null,
      isMouse,
    };

    if (config.preventDefault) {
      event.preventDefault();
    }

    // Set timeout for long press
    const timeoutId = window.setTimeout(() => {
      const state = stateRef.current;
      if (state.isPressed) {
        state.isLongPress = true;
        
        // Trigger haptic feedback
        if (config.enableHaptics) {
          triggerHapticFeedback(config.hapticType);
        }

        const details: LongPressDetails = {
          duration: Date.now() - state.startTime,
          startPosition: { x: state.startX, y: state.startY },
          currentPosition: { x, y },
          distance: 0,
        };

        handlersRef.current.onLongPressStart?.(event);
        handlersRef.current.onLongPress?.(event, details);
      }
    }, config.duration);

    stateRef.current.timeoutId = timeoutId;
  }, [getEventPosition, clearLongPressTimeout]);

  const handleEnd = useCallback((event: TouchEvent | MouseEvent) => {
    const state = stateRef.current;
    
    if (!state.isPressed) return;

    clearLongPressTimeout();

    const wasLongPress = state.isLongPress;
    
    // Reset state
    stateRef.current.isPressed = false;
    stateRef.current.isLongPress = false;

    if (wasLongPress) {
      handlersRef.current.onLongPressEnd?.(event);
    } else {
      // Regular click/tap
      handlersRef.current.onClick?.(event);
    }
  }, [clearLongPressTimeout]);

  const handleMove = useCallback((event: TouchEvent | MouseEvent) => {
    const state = stateRef.current;
    
    if (!state.isPressed) return;

    const { x, y } = getEventPosition(event);
    const distance = calculateDistance(state.startX, state.startY, x, y);
    const config = configRef.current;

    // Cancel if moved too far
    if (distance > config.threshold) {
      clearLongPressTimeout();
      stateRef.current.isPressed = false;
      stateRef.current.isLongPress = false;
      handlersRef.current.onLongPressCancel?.(event);
    }

    if (config.preventDefault && state.isPressed) {
      event.preventDefault();
    }
  }, [getEventPosition, calculateDistance, clearLongPressTimeout]);

  const handleLeave = useCallback((event: TouchEvent | MouseEvent) => {
    const config = configRef.current;
    
    if (config.cancelOnLeave && stateRef.current.isPressed) {
      clearLongPressTimeout();
      stateRef.current.isPressed = false;
      stateRef.current.isLongPress = false;
      handlersRef.current.onLongPressCancel?.(event);
    }
  }, [clearLongPressTimeout]);

  const handleCancel = useCallback((event: TouchEvent | MouseEvent) => {
    if (stateRef.current.isPressed) {
      clearLongPressTimeout();
      stateRef.current.isPressed = false;
      stateRef.current.isLongPress = false;
      handlersRef.current.onLongPressCancel?.(event);
    }
  }, [clearLongPressTimeout]);

  // Touch event handlers
  const touchHandlers = {
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onTouchMove: handleMove,
    onTouchCancel: handleCancel,
  };

  // Mouse event handlers (if enabled)
  const mouseHandlers = configRef.current.enableMouse ? {
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
  } : {};

  return {
    ...touchHandlers,
    ...mouseHandlers,
  };
}