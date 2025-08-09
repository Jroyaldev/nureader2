'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  className?: string;
  value: number; // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'striped';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  showPercentage?: boolean;
  showValue?: boolean;
  label?: string;
  animated?: boolean;
  indeterminate?: boolean;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ 
    className, 
    value,
    max = 100,
    size = 'md',
    variant = 'default',
    color = 'primary',
    showPercentage = false,
    showValue = false,
    label,
    animated = true,
    indeterminate = false,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3'
    };

    const colorClasses = {
      primary: 'bg-blue-600 dark:bg-blue-500',
      secondary: 'bg-gray-600 dark:bg-gray-500',
      success: 'bg-green-600 dark:bg-green-500',
      warning: 'bg-yellow-600 dark:bg-yellow-500',
      error: 'bg-red-600 dark:bg-red-500'
    };

    const gradientClasses = {
      primary: 'bg-gradient-to-r from-blue-500 to-blue-600',
      secondary: 'bg-gradient-to-r from-gray-500 to-gray-600',
      success: 'bg-gradient-to-r from-green-500 to-green-600',
      warning: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
      error: 'bg-gradient-to-r from-red-500 to-red-600'
    };

    const getProgressBarClasses = () => {
      let classes = cn(
        'h-full rounded-full transition-all duration-300 ease-out',
        variant === 'gradient' ? gradientClasses[color] : colorClasses[color]
      );

      if (variant === 'striped') {
        classes = cn(
          classes,
          'bg-stripes',
          animated && 'animate-stripes'
        );
      }

      if (indeterminate) {
        classes = cn(classes, 'animate-indeterminate');
      }

      return classes;
    };

    return (
      <div className={cn('w-full', className)} ref={ref} {...props}>
        {(label || showPercentage || showValue) && (
          <div className="flex justify-between items-center mb-1">
            {label && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </span>
            )}
            {(showPercentage || showValue) && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {showPercentage && `${Math.round(percentage)}%`}
                {showValue && !showPercentage && `${value}/${max}`}
              </span>
            )}
          </div>
        )}
        
        <div
          className={cn(
            'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
            sizeClasses[size]
          )}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label || `Progress: ${Math.round(percentage)}%`}
        >
          <div
            className={getProgressBarClasses()}
            style={{
              width: indeterminate ? '30%' : `${percentage}%`,
              ...(indeterminate && {
                animation: 'indeterminate 2s infinite linear'
              })
            }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

export { ProgressBar };