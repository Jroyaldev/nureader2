'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  id?: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  className?: string;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ 
    id,
    title,
    description,
    variant = 'default',
    duration = 5000,
    persistent = false,
    action,
    onClose,
    className,
    ...props 
  }, ref) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
      if (!persistent && duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    }, [duration, persistent]);

    const handleClose = () => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 150); // Animation duration
    };

    if (!isVisible) return null;

    const variantClasses = {
      default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
      success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
      error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
    };

    const iconClasses = {
      default: '📄',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex items-start space-x-3 p-4 rounded-lg border shadow-lg',
          'transform transition-all duration-150 ease-out',
          isExiting 
            ? 'translate-x-full opacity-0 scale-95' 
            : 'translate-x-0 opacity-100 scale-100',
          variantClasses[variant],
          className
        )}
        role="alert"
        aria-live="polite"
        {...props}
      >
        {/* Icon */}
        <div className="flex-shrink-0 text-lg">
          {iconClasses[variant]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-sm font-semibold mb-1">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-sm opacity-90">
              {description}
            </p>
          )}
        </div>

        {/* Action */}
        {action && (
          <div className="flex-shrink-0">
            <button
              onClick={action.onClick}
              className={cn(
                'text-sm font-medium underline hover:no-underline',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 rounded',
                variant === 'default' && 'text-blue-600 dark:text-blue-400 focus:ring-blue-500',
                variant === 'success' && 'text-green-700 dark:text-green-300 focus:ring-green-500',
                variant === 'warning' && 'text-yellow-700 dark:text-yellow-300 focus:ring-yellow-500',
                variant === 'error' && 'text-red-700 dark:text-red-300 focus:ring-red-500',
                variant === 'info' && 'text-blue-700 dark:text-blue-300 focus:ring-blue-500'
              )}
            >
              {action.label}
            </button>
          </div>
        )}

        {/* Close button */}
        {!persistent && (
          <button
            onClick={handleClose}
            className={cn(
              'flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500',
              'transition-colors duration-150'
            )}
            aria-label="Close notification"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Progress bar for auto-dismiss */}
        {!persistent && duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-current opacity-30 rounded-b-lg"
              style={{
                animation: `toast-progress ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

export { Toast };