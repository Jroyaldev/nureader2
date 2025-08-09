/**
 * Mobile Navigation Utilities
 * 
 * Utility components and hooks for mobile navigation patterns.
 * Provides touch-optimized interactions and responsive behavior.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useLongPress } from '@/hooks/useLongPress';

// ===== MOBILE NAVIGATION CONTEXT =====

interface MobileNavigationContextType {
  /** Current screen size category */
  screenSize: 'mobile' | 'tablet' | 'desktop';
  /** Whether device supports touch */
  hasTouch: boolean;
  /** Current orientation */
  orientation: 'portrait' | 'landscape';
  /** Safe area insets */
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

const MobileNavigationContext = React.createContext<MobileNavigationContextType | null>(null);

export const useMobileNavigation = () => {
  const context = React.useContext(MobileNavigationContext);
  if (!context) {
    throw new Error('useMobileNavigation must be used within MobileNavigationProvider');
  }
  return context;
};

// ===== MOBILE NAVIGATION PROVIDER =====

export interface MobileNavigationProviderProps {
  children: React.ReactNode;
}

export const MobileNavigationProvider: React.FC<MobileNavigationProviderProps> = ({ children }) => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [hasTouch, setHasTouch] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  // Detect screen size
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Detect touch support
  useEffect(() => {
    const checkTouch = () => {
      setHasTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkTouch();
  }, []);

  // Detect orientation
  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  // Detect safe area insets (for devices with notches, etc.)
  useEffect(() => {
    const updateSafeAreaInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      setSafeAreaInsets({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
      });
    };

    updateSafeAreaInsets();
    window.addEventListener('resize', updateSafeAreaInsets);
    return () => window.removeEventListener('resize', updateSafeAreaInsets);
  }, []);

  const value: MobileNavigationContextType = {
    screenSize,
    hasTouch,
    orientation,
    safeAreaInsets,
  };

  return (
    <MobileNavigationContext.Provider value={value}>
      {children}
    </MobileNavigationContext.Provider>
  );
};

// ===== TOUCH TARGET =====

export interface TouchTargetProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Minimum touch target size */
  minSize?: number;
  /** Whether to show visual feedback on touch */
  showFeedback?: boolean;
  /** Touch feedback variant */
  feedbackVariant?: 'scale' | 'opacity' | 'background';
  /** Whether the target is disabled */
  disabled?: boolean;
  /** Long press handler */
  onLongPress?: () => void;
  /** Long press duration */
  longPressDuration?: number;
}

export const TouchTarget = React.forwardRef<HTMLDivElement, TouchTargetProps>(
  ({ 
    className,
    children,
    minSize = 44,
    showFeedback = true,
    feedbackVariant = 'scale',
    disabled = false,
    onLongPress,
    longPressDuration = 500,
    onClick,
    ...props 
  }, ref) => {
    const [isPressed, setIsPressed] = useState(false);
    const { hasTouch } = useMobileNavigation();

    const longPressHandlers = useLongPress(
      {
        onLongPress: onLongPress ? () => onLongPress() : undefined,
        onClick: onClick ? (e) => onClick(e as any) : undefined,
      },
      {
        duration: longPressDuration,
        enableMouse: !hasTouch,
        enableHaptics: hasTouch,
      }
    );

    const handleTouchStart = useCallback(() => {
      if (!disabled && showFeedback) {
        setIsPressed(true);
      }
    }, [disabled, showFeedback]);

    const handleTouchEnd = useCallback(() => {
      setIsPressed(false);
    }, []);

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center',
          'transition-all duration-150 ease-out',
          'select-none touch-manipulation',
          
          // Minimum touch target size
          `min-w-[${minSize}px] min-h-[${minSize}px]`,
          
          // Touch feedback
          showFeedback && !disabled && [
            feedbackVariant === 'scale' && isPressed && 'scale-95',
            feedbackVariant === 'opacity' && isPressed && 'opacity-70',
            feedbackVariant === 'background' && isPressed && 'bg-muted/50',
          ],
          
          // Disabled state
          disabled && 'opacity-50 cursor-not-allowed',
          
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        {...longPressHandlers}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TouchTarget.displayName = 'TouchTarget';

// ===== SWIPE CONTAINER =====

export interface SwipeContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Swipe handlers */
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /** Swipe threshold in pixels */
  swipeThreshold?: number;
  /** Velocity threshold */
  velocityThreshold?: number;
  /** Whether to prevent default touch behavior */
  preventDefault?: boolean;
  /** Visual feedback during swipe */
  showSwipeFeedback?: boolean;
}

export const SwipeContainer = React.forwardRef<HTMLDivElement, SwipeContainerProps>(
  ({ 
    className,
    children,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    swipeThreshold = 50,
    velocityThreshold = 0.3,
    preventDefault = true,
    showSwipeFeedback = false,
    ...props 
  }, ref) => {
    const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });
    const [isSwipping, setIsSwipping] = useState(false);

    const swipeHandlers = useSwipeGesture(
      {
        onSwipeLeft: onSwipeLeft,
        onSwipeRight: onSwipeRight,
        onSwipeUp: onSwipeUp,
        onSwipeDown: onSwipeDown,
        onSwipeStart: () => {
          if (showSwipeFeedback) {
            setIsSwipping(true);
          }
        },
        onSwipeEnd: () => {
          if (showSwipeFeedback) {
            setIsSwipping(false);
            setSwipeOffset({ x: 0, y: 0 });
          }
        },
      },
      {
        threshold: swipeThreshold,
        velocityThreshold,
        preventDefault,
        enableMouse: false, // Only enable touch for mobile
      }
    );

    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          'transition-transform duration-150 ease-out',
          isSwipping && showSwipeFeedback && 'scale-[0.98]',
          className
        )}
        style={
          showSwipeFeedback && isSwipping
            ? { transform: `translate(${swipeOffset.x}px, ${swipeOffset.y}px)` }
            : undefined
        }
        {...swipeHandlers}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SwipeContainer.displayName = 'SwipeContainer';

// ===== RESPONSIVE NAVIGATION WRAPPER =====

export interface ResponsiveNavigationWrapperProps {
  /** Mobile navigation component */
  mobileComponent: React.ReactNode;
  /** Tablet navigation component */
  tabletComponent?: React.ReactNode;
  /** Desktop navigation component */
  desktopComponent?: React.ReactNode;
  /** Breakpoints for switching components */
  breakpoints?: {
    mobile: number;
    tablet: number;
  };
  /** Whether to animate transitions */
  animate?: boolean;
}

export const ResponsiveNavigationWrapper: React.FC<ResponsiveNavigationWrapperProps> = ({
  mobileComponent,
  tabletComponent,
  desktopComponent,
  breakpoints = { mobile: 768, tablet: 1024 },
  animate = true,
}) => {
  const { screenSize } = useMobileNavigation();

  const getCurrentComponent = () => {
    switch (screenSize) {
      case 'mobile':
        return mobileComponent;
      case 'tablet':
        return tabletComponent || mobileComponent;
      case 'desktop':
        return desktopComponent || tabletComponent || mobileComponent;
      default:
        return mobileComponent;
    }
  };

  return (
    <div
      className={cn(
        'w-full',
        animate && 'transition-all duration-300 ease-in-out'
      )}
    >
      {getCurrentComponent()}
    </div>
  );
};

// ===== MOBILE NAVIGATION CONSTANTS =====

export const MOBILE_NAVIGATION_CONSTANTS = {
  // Touch target sizes (following Apple and Material Design guidelines)
  TOUCH_TARGET_MIN: 44, // Minimum touch target size in pixels
  TOUCH_TARGET_COMFORTABLE: 48, // Comfortable touch target size
  TOUCH_TARGET_LARGE: 56, // Large touch target size
  
  // Spacing
  MOBILE_PADDING: 16, // Standard mobile padding
  MOBILE_MARGIN: 8, // Standard mobile margin
  
  // Animation durations
  ANIMATION_FAST: 150, // Fast animations
  ANIMATION_NORMAL: 200, // Normal animations
  ANIMATION_SLOW: 300, // Slow animations
  
  // Gesture thresholds
  SWIPE_THRESHOLD: 50, // Minimum distance for swipe
  VELOCITY_THRESHOLD: 0.3, // Minimum velocity for swipe
  LONG_PRESS_DURATION: 500, // Long press duration
  
  // Breakpoints
  BREAKPOINT_MOBILE: 768, // Mobile breakpoint
  BREAKPOINT_TABLET: 1024, // Tablet breakpoint
} as const;

// ===== MOBILE NAVIGATION HOOKS =====

/**
 * Hook for detecting if the current device is mobile
 */
export const useIsMobile = () => {
  const { screenSize } = useMobileNavigation();
  return screenSize === 'mobile';
};

/**
 * Hook for detecting if the current device has touch support
 */
export const useHasTouch = () => {
  const { hasTouch } = useMobileNavigation();
  return hasTouch;
};

/**
 * Hook for getting current orientation
 */
export const useOrientation = () => {
  const { orientation } = useMobileNavigation();
  return orientation;
};

/**
 * Hook for getting safe area insets
 */
export const useSafeAreaInsets = () => {
  const { safeAreaInsets } = useMobileNavigation();
  return safeAreaInsets;
};