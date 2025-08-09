'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  lines?: number; // For text variant
  children?: React.ReactNode;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    variant = 'rectangular',
    width,
    height,
    animation = 'pulse',
    lines = 1,
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'bg-gray-200 dark:bg-gray-700';
    
    const variantClasses = {
      text: 'rounded-sm',
      circular: 'rounded-full',
      rectangular: 'rounded-none',
      rounded: 'rounded-md'
    };

    const animationClasses = {
      pulse: 'animate-pulse',
      wave: 'animate-shimmer',
      none: ''
    };

    const style: React.CSSProperties = {
      width: width || (variant === 'text' ? '100%' : undefined),
      height: height || (variant === 'text' ? '1em' : variant === 'circular' ? '40px' : '20px'),
      ...(variant === 'circular' && !width && { width: height || '40px' })
    };

    if (variant === 'text' && lines > 1) {
      return (
        <div className={cn('space-y-2', className)} ref={ref} {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={cn(
                baseClasses,
                variantClasses[variant],
                animationClasses[animation],
                index === lines - 1 && 'w-3/4' // Last line is shorter
              )}
              style={{
                height: height || '1em'
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          animationClasses[animation],
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Skeleton.displayName = 'Skeleton';

export { Skeleton };