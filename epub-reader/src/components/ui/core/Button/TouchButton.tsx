"use client";

import React, { useCallback } from 'react';
import { Button } from './Button';
import { cn } from '@/utils/theme';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'reader';
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
  pressEffect?: 'scale' | 'opacity' | 'none';
  minSize?: 'standard' | 'large';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * TouchButton Component - Mobile-optimized button with haptic feedback
 * Ensures 44px+ touch targets and proper mobile interactions
 * Based on successful MobileToolbar button patterns
 */
export const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ 
    variant = 'reader',
    haptic = 'light',
    pressEffect = 'scale',
    minSize = 'standard',
    icon,
    className,
    onClick,
    ...props 
  }, ref) => {
    
    const handlePress = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      // Haptic feedback for supported devices
      if (haptic !== 'none' && 'vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30]
        };
        navigator.vibrate(patterns[haptic]);
      }
      
      onClick?.(event);
    }, [onClick, haptic]);
    
    const sizeClasses = {
      standard: 'min-w-[44px] min-h-[44px]',
      large: 'min-w-[48px] min-h-[48px]'
    };
    
    const pressClasses = {
      scale: 'active:scale-95 transform transition-transform duration-100',
      opacity: 'active:opacity-70 transition-opacity duration-100', 
      none: ''
    };
    
    return (
      <Button
        ref={ref}
        variant={variant}
        size="touch"
        onClick={handlePress}
        className={cn(
          sizeClasses[minSize],
          pressClasses[pressEffect],
          'touch-manipulation', // Optimize for touch
          '-webkit-tap-highlight-color: transparent', // Remove iOS highlight
          'select-none', // Prevent text selection
          className
        )}
        icon={icon}
        {...props}
      />
    );
  }
);

TouchButton.displayName = 'TouchButton';