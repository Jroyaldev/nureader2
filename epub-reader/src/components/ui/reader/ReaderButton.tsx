"use client";

import React from 'react';
import { Button } from '../core/Button/Button';
import { TouchButton } from '../core/Button/TouchButton';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/utils/theme';

interface ReaderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'reader';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  touchOptimized?: boolean;
}

/**
 * ReaderButton Component - Optimized for reader UI interactions
 * Automatically switches between desktop and mobile-optimized versions
 * Uses consistent reader button styling from theme system
 */
export const ReaderButton = React.forwardRef<HTMLButtonElement, ReaderButtonProps>(
  ({ 
    variant = 'reader',
    size = 'md',
    icon,
    touchOptimized = true,
    className,
    children,
    ...props 
  }, ref) => {
    
    const { isMobile } = useBreakpoint();
    
    // Use TouchButton on mobile for better interaction
    if (isMobile && touchOptimized) {
      return (
        <TouchButton
          ref={ref}
          variant={variant}
          icon={icon}
          haptic="light"
          pressEffect="scale"
          className={cn(
            'reader-btn',
            // Reader-specific styling
            'text-secondary hover:text-primary',
            'hover:surface-glass-low active:surface-glass-medium',
            'transition-all duration-200',
            className
          )}
          {...props}
        >
          {children}
        </TouchButton>
      );
    }
    
    // Desktop version with standard Button
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        icon={icon}
        className={cn(
          'reader-btn',
          // Reader-specific styling that matches TOC buttons
          'text-secondary hover:text-primary',
          'hover:bg-[rgba(var(--interactive-hover),0.08)]',
          'active:bg-[rgba(var(--interactive-active),0.12)]',
          'transition-all duration-200',
          'font-medium',
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

ReaderButton.displayName = 'ReaderButton';