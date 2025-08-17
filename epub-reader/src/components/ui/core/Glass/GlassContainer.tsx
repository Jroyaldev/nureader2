"use client";

import React from 'react';
import { cn } from '@/utils/theme';

interface GlassContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  opacity?: 'low' | 'medium' | 'high' | 'solid';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
}

/**
 * GlassContainer Component - Standardized glassmorphism
 * Replaces all hardcoded bg-white/90 dark:bg-black/90 patterns
 * Based on successful TableOfContents glass implementation
 */
export const GlassContainer = React.forwardRef<HTMLDivElement, GlassContainerProps>(
  ({ 
    opacity = 'medium',
    blur = 'lg', 
    border = true,
    shadow = 'lg',
    rounded = 'xl',
    className,
    children,
    ...props 
  }, ref) => {
    
    // Use our semantic glass classes from the theme system
    const opacityClasses = {
      low: 'surface-glass-low',
      medium: 'surface-glass-medium', 
      high: 'surface-glass-high',
      solid: 'surface-glass-solid'
    };
    
    // Additional blur control (beyond what's in the semantic classes)
    const blurClasses = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg', 
      xl: 'backdrop-blur-xl'
    };
    
    const shadowClasses = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg shadow-black/10 dark:shadow-black/30',
      xl: 'shadow-xl shadow-black/20 dark:shadow-black/50'
    };
    
    const roundedClasses = {
      none: '',
      sm: 'rounded-sm',
      md: 'rounded-md', 
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl'
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          // Base glass effect from our semantic classes
          opacityClasses[opacity],
          
          // Additional blur override if needed
          blur !== 'lg' && blurClasses[blur],
          
          // Enhanced saturation for better glass effect
          'backdrop-saturate-200',
          
          // Optional border (included in semantic classes but can be disabled)
          !border && 'border-0',
          
          // Shadow
          shadowClasses[shadow],
          
          // Border radius
          roundedClasses[rounded],
          
          // Text color inheritance
          'text-primary',
          
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassContainer.displayName = 'GlassContainer';