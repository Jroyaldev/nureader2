/**
 * Touch Interactions Components Index
 * 
 * Exports all touch interaction components and hooks for easy importing.
 */

export { PinchZoom } from './PinchZoom';
export { TouchButton, TouchCard, Ripple } from './TouchFeedback';

// Re-export types
export type { PinchZoomProps } from './PinchZoom';
export type { TouchButtonProps, TouchCardProps, RippleProps } from './TouchFeedback';

// Re-export hooks
export { useSwipeGesture } from '../../hooks/useSwipeGesture';
export { useLongPress } from '../../hooks/useLongPress';

// Re-export hook types
export type { 
  SwipeGestureConfig, 
  SwipeGestureHandlers, 
  SwipeDetails, 
  SwipeDirection 
} from '../../hooks/useSwipeGesture';

export type { 
  LongPressConfig, 
  LongPressHandlers, 
  LongPressDetails 
} from '../../hooks/useLongPress';