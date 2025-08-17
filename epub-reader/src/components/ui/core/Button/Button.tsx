"use client";

import React from 'react';
import { cn } from '@/utils/theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'reader';
  size?: 'sm' | 'md' | 'lg' | 'touch';
  theme?: 'auto' | 'glass' | 'solid';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Enhanced Button Component - Theme-aware and consistent
 * Based on the successful patterns from TableOfContents
 * Replaces inconsistent button implementations across the app
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'secondary', 
    size = 'md', 
    theme = 'auto',
    loading = false,
    icon,
    className,
    children,
    disabled,
    ...props 
  }, ref) => {
    
    const baseClasses = cn(
      // Base styles with proper focus management
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-interactive-focus/40',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      'select-none'
    );
    
    const variantClasses = {
      primary: cn(
        'bg-interactive-focus text-text-inverse',
        'hover:bg-interactive-focus/90 active:bg-interactive-focus/80',
        'shadow-sm hover:shadow-md active:shadow-sm'
      ),
      secondary: cn(
        'surface-secondary text-primary border border-primary/10',
        'hover:surface-elevated hover:border-primary/20',
        'active:surface-primary'
      ),
      ghost: cn(
        'text-secondary hover:text-primary',
        'hover:interactive-hover active:interactive-active'
      ),
      reader: cn(
        'text-secondary hover:text-primary',
        'hover:surface-glass-low active:surface-glass-medium',
        'transition-all duration-200'
      )
    };
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
      md: 'px-4 py-2 text-base rounded-xl gap-2', 
      lg: 'px-6 py-3 text-lg rounded-xl gap-2',
      touch: 'min-w-[44px] min-h-[44px] px-3 py-2 text-base rounded-xl gap-2' // Mobile-optimized
    };
    
    const themeClasses = {
      auto: '',
      glass: 'backdrop-blur-md bg-opacity-80',
      solid: 'bg-opacity-100'
    };
    
    return (
      <button 
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          themeClasses[theme],
          loading && 'cursor-wait',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {icon && !loading && icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';