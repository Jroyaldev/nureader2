"use client";

import React from 'react';
import { Button } from './Button';
import { cn } from '@/utils/theme';

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'touch';
  variant?: 'primary' | 'secondary' | 'ghost' | 'reader';
  theme?: 'auto' | 'glass' | 'solid';
  loading?: boolean;
  'aria-label': string; // Required for accessibility
}

/**
 * IconButton Component - For icon-only buttons
 * Ensures proper touch targets and accessibility
 * Used throughout reader UI for consistent icon buttons
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 
    icon,
    size = 'md',
    variant = 'ghost',
    theme = 'auto',
    className,
    ...props 
  }, ref) => {
    
    // Ensure circular/square design for icon-only buttons
    const iconSizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10', 
      lg: 'w-12 h-12',
      touch: 'w-11 h-11' // Slightly larger for better touch targets
    };
    
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        theme={theme}
        className={cn(
          iconSizeClasses[size],
          'p-0', // Remove padding for icon-only buttons
          className
        )}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';