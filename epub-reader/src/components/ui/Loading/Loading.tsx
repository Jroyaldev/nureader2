import React from 'react';
import { cn } from '@/utils';

/**
 * Spinner component for loading states
 */
export interface SpinnerProps {
  /**
   * Size of the spinner
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Color variant
   */
  variant?: 'primary' | 'white' | 'gray';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Accessible label
   */
  label?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const variantClasses = {
  primary: 'text-purple-600 dark:text-purple-400',
  white: 'text-white',
  gray: 'text-gray-600 dark:text-gray-400',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className,
  label = 'Loading',
}) => {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('inline-block', className)}
    >
      <svg
        className={cn(
          'animate-spin',
          sizeClasses[size],
          variantClasses[variant]
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
};

Spinner.displayName = 'Spinner';

/**
 * Loading overlay component
 */
export interface LoadingOverlayProps {
  /**
   * Whether the overlay is visible
   */
  isLoading: boolean;
  /**
   * Loading message
   */
  message?: string;
  /**
   * Whether to blur the background
   */
  blur?: boolean;
  /**
   * Whether the overlay is fullscreen
   */
  fullscreen?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Children to render behind the overlay
   */
  children?: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  blur = true,
  fullscreen = false,
  className,
  children,
}) => {
  if (!isLoading && !children) return null;

  return (
    <div className={cn('relative', fullscreen && 'min-h-screen', className)}>
      {children}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center',
            'glass-overlay loading-overlay',
            'z-10 animate-in fade-in-0'
          )}
        >
          <Spinner size="lg" />
          {message && (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

LoadingOverlay.displayName = 'LoadingOverlay';

/**
 * Skeleton component for placeholder loading states
 */
export interface SkeletonProps {
  /**
   * Variant of the skeleton
   */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /**
   * Width of the skeleton
   */
  width?: string | number;
  /**
   * Height of the skeleton
   */
  height?: string | number;
  /**
   * Whether to animate the skeleton
   */
  animate?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Number of lines for text variant
   */
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animate = true,
  className,
  lines = 1,
}) => {
  const baseClasses = cn(
    'bg-gray-200 dark:bg-gray-700',
    animate && 'animate-pulse',
    className
  );

  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'circular' ? '40px' : variant === 'text' ? '16px' : '100px'),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClasses, variantStyles[variant])}
            style={{
              ...style,
              width: i === lines - 1 ? '80%' : width || '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, variantStyles[variant])}
      style={style}
      aria-hidden="true"
    />
  );
};

Skeleton.displayName = 'Skeleton';

/**
 * Card skeleton component
 */
export interface CardSkeletonProps {
  /**
   * Whether to show image placeholder
   */
  showImage?: boolean;
  /**
   * Whether to show avatar placeholder
   */
  showAvatar?: boolean;
  /**
   * Number of text lines
   */
  lines?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showImage = true,
  showAvatar = false,
  lines = 3,
  className,
}) => {
  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg p-4 shadow', className)}>
      {showImage && (
        <Skeleton variant="rounded" height={200} className="mb-4" />
      )}
      {showAvatar && (
        <div className="flex items-center gap-3 mb-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton variant="text" width="40%" className="mb-1" />
            <Skeleton variant="text" width="30%" height={12} />
          </div>
        </div>
      )}
      <Skeleton variant="text" lines={lines} />
    </div>
  );
};

CardSkeleton.displayName = 'CardSkeleton';

/**
 * Progress bar component
 */
export interface ProgressBarProps {
  /**
   * Progress value (0-100)
   */
  value: number;
  /**
   * Maximum value
   */
  max?: number;
  /**
   * Label for the progress bar
   */
  label?: string;
  /**
   * Whether to show the percentage
   */
  showPercentage?: boolean;
  /**
   * Color variant
   */
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  /**
   * Size of the progress bar
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to animate the progress
   */
  animate?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

const progressVariantClasses = {
  primary: 'bg-gradient-to-r from-purple-600 to-pink-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-600',
  danger: 'bg-red-600',
};

const progressSizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = false,
  variant = 'primary',
  size = 'md',
  animate = true,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
          progressSizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            progressVariantClasses[variant],
            animate && 'animate-in slide-in-from-left'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

ProgressBar.displayName = 'ProgressBar';

/**
 * Dots loading indicator
 */
export const DotsLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex gap-1', className)} aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
};

DotsLoader.displayName = 'DotsLoader';