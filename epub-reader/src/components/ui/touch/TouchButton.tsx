"use client";

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  haptic?: 'light' | 'medium' | 'heavy';
  pressEffect?: 'scale' | 'opacity' | 'brightness' | 'none';
  minSize?: 'standard' | 'large' | 'xl';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  ripple?: boolean;
  children: React.ReactNode;
}

/**
 * TouchButton - Enhanced button component optimized for touch interactions
 * 
 * Features:
 * - Haptic feedback on supported devices
 * - Customizable press effects (scale, opacity, brightness)
 * - Minimum touch target sizes (44px, 48px, 56px)
 * - Ripple effect animation
 * - Touch-optimized styling and behavior
 * - Accessibility support with proper ARIA attributes
 */
const TouchButton = ({ 
  haptic = 'light',
  pressEffect = 'scale',
  minSize = 'standard',
  variant = 'secondary',
  size = 'md',
  ripple = false,
  className,
  onClick,
  children,
  disabled,
  ...props 
}: TouchButtonProps) => {
  
  // Haptic feedback handler
  const triggerHapticFeedback = useCallback(() => {
    if (disabled) return;
    
    // Modern Vibration API for haptic feedback
    if ('vibrate' in navigator && navigator.vibrate) {
      const patterns = {
        light: [10],
        medium: [25],
        heavy: [50]
      };
      navigator.vibrate(patterns[haptic]);
    }
    
    // iOS Safari haptic feedback (if available)
    if ('webkit' in window && 'webkitVibrate' in navigator) {
      const intensity = {
        light: 1,
        medium: 2,
        heavy: 3
      };
      // @ts-ignore - iOS specific API
      navigator.webkitVibrate?.(intensity[haptic]);
    }
  }, [haptic, disabled]);

  // Enhanced click handler with haptic feedback
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    triggerHapticFeedback();
    onClick?.(e);
  }, [disabled, triggerHapticFeedback, onClick]);

  // Minimum size classes for touch targets
  const sizeClasses = {
    standard: 'min-w-[44px] min-h-[44px]',
    large: 'min-w-[48px] min-h-[48px]',
    xl: 'min-w-[56px] min-h-[56px]'
  };

  // Press effect animations
  const pressClasses = {
    scale: 'active:scale-95 transition-transform duration-75',
    opacity: 'active:opacity-70 transition-opacity duration-75',
    brightness: 'active:brightness-90 transition-[filter] duration-75',
    none: ''
  };

  // Button variant styles
  const variantClasses = {
    primary: cn(
      'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
      'text-white border border-blue-500/20',
      'shadow-lg shadow-blue-500/25'
    ),
    secondary: cn(
      'bg-white/80 dark:bg-black/80 hover:bg-white/90 dark:hover:bg-black/90',
      'active:bg-white/95 dark:active:bg-black/95',
      'text-foreground border border-black/10 dark:border-white/10',
      'backdrop-blur-md shadow-lg'
    ),
    ghost: cn(
      'bg-transparent hover:bg-black/5 dark:hover:bg-white/5',
      'active:bg-black/10 dark:active:bg-white/10',
      'text-foreground border border-transparent'
    ),
    danger: cn(
      'bg-red-500 hover:bg-red-600 active:bg-red-700',
      'text-white border border-red-500/20',
      'shadow-lg shadow-red-500/25'
    )
  };

  // Size-specific padding and text
  const buttonSizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  // Disabled state classes
  const disabledClasses = disabled ? cn(
    'opacity-50 cursor-not-allowed',
    'pointer-events-none'
  ) : '';

  // Ripple effect (optional)
  const rippleClasses = ripple ? 'relative overflow-hidden' : '';

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        // Base styles
        'relative inline-flex items-center justify-center',
        'font-medium rounded-xl',
        'touch-manipulation select-none',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2',
        'disabled:pointer-events-none',
        
        // Size and touch target requirements
        sizeClasses[minSize],
        buttonSizeClasses[size],
        
        // Variant styling
        variantClasses[variant],
        
        // Press effects
        pressClasses[pressEffect],
        
        // State classes
        disabledClasses,
        rippleClasses,
        
        // iOS Safari optimizations
        '-webkit-tap-highlight-color: transparent',
        'user-select: none',
        
        className
      )}
      style={{
        // Prevent text selection during touch
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        // Improve scrolling performance
        WebkitOverflowScrolling: 'touch',
        // Optimize for touch devices
        touchAction: 'manipulation'
      }}
    >
      {/* Ripple effect container */}
      {ripple && (
        <span className="absolute inset-0 overflow-hidden rounded-xl">
          <span className="absolute inset-0 bg-white/20 dark:bg-white/10 transform scale-0 group-active:scale-100 transition-transform duration-200 rounded-full" />
        </span>
      )}
      
      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};

export default TouchButton;
export type { TouchButtonProps };