'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'bars' | 'ring';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  speed?: 'slow' | 'normal' | 'fast';
  label?: string;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ 
    className, 
    size = 'md',
    variant = 'default',
    color = 'primary',
    speed = 'normal',
    label = 'Loading...',
    ...props 
  }, ref) => {
    const sizeClasses = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12'
    };

    const colorClasses = {
      primary: 'text-blue-600 dark:text-blue-400',
      secondary: 'text-gray-600 dark:text-gray-400',
      white: 'text-white',
      gray: 'text-gray-400'
    };

    const speedClasses = {
      slow: 'animate-spin-slow',
      normal: 'animate-spin',
      fast: 'animate-spin-fast'
    };

    if (variant === 'default') {
      return (
        <div
          ref={ref}
          className={cn(
            'inline-block border-2 border-current border-t-transparent rounded-full',
            sizeClasses[size],
            colorClasses[color],
            speedClasses[speed],
            className
          )}
          role="status"
          aria-label={label}
          {...props}
        >
          <span className="sr-only">{label}</span>
        </div>
      );
    }

    if (variant === 'dots') {
      return (
        <div
          ref={ref}
          className={cn(
            'inline-flex space-x-1',
            className
          )}
          role="status"
          aria-label={label}
          {...props}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'rounded-full animate-bounce',
                sizeClasses[size].replace('w-', 'w-').replace('h-', 'h-'),
                colorClasses[color].replace('text-', 'bg-'),
                i === 1 && 'animation-delay-150',
                i === 2 && 'animation-delay-300'
              )}
              style={{
                animationDelay: i === 1 ? '0.15s' : i === 2 ? '0.3s' : '0s'
              }}
            />
          ))}
          <span className="sr-only">{label}</span>
        </div>
      );
    }

    if (variant === 'bars') {
      return (
        <div
          ref={ref}
          className={cn(
            'inline-flex space-x-1 items-end',
            className
          )}
          role="status"
          aria-label={label}
          {...props}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'animate-pulse',
                size === 'xs' && 'w-0.5 h-3',
                size === 'sm' && 'w-0.5 h-4',
                size === 'md' && 'w-1 h-6',
                size === 'lg' && 'w-1 h-8',
                size === 'xl' && 'w-1.5 h-12',
                colorClasses[color].replace('text-', 'bg-')
              )}
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1.2s'
              }}
            />
          ))}
          <span className="sr-only">{label}</span>
        </div>
      );
    }

    if (variant === 'ring') {
      return (
        <div
          ref={ref}
          className={cn(
            'inline-block relative',
            sizeClasses[size],
            className
          )}
          role="status"
          aria-label={label}
          {...props}
        >
          <div className={cn(
            'absolute inset-0 rounded-full border-2 border-transparent',
            'border-t-current border-r-current',
            colorClasses[color],
            speedClasses[speed]
          )} />
          <div className={cn(
            'absolute inset-1 rounded-full border-2 border-transparent',
            'border-b-current border-l-current',
            colorClasses[color],
            'animate-spin-reverse'
          )} />
          <span className="sr-only">{label}</span>
        </div>
      );
    }

    return null;
  }
);

Spinner.displayName = 'Spinner';

export { Spinner };