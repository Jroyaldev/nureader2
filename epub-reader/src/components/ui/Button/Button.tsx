import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

/**
 * Button component variants using class-variance-authority
 * Provides consistent styling across all button types
 */
const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 focus-visible:ring-purple-500',
        secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 focus-visible:ring-gray-500',
        outline: 'border-2 border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-gray-500',
        ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
        link: 'text-purple-600 dark:text-purple-400 underline-offset-4 hover:underline focus-visible:ring-purple-500',
      },
      size: {
        sm: 'h-8 px-3 text-xs gap-1.5',
        md: 'h-10 px-4 py-2 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2',
        xl: 'h-14 px-8 text-lg gap-3',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      loading: {
        true: 'cursor-wait',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false,
    },
  }
);

/**
 * Loading spinner component
 */
const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    aria-hidden="true"
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
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Loading state - shows spinner and disables interaction
   */
  loading?: boolean;
  /**
   * Icon to display before the button text
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon to display after the button text
   */
  rightIcon?: React.ReactNode;
  /**
   * Accessible label for screen readers when using icon-only buttons
   */
  ariaLabel?: string;
  /**
   * Keyboard shortcut hint
   */
  shortcut?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Button component with comprehensive accessibility support
 * 
 * @example
 * ```tsx
 * // Primary button
 * <Button onClick={handleClick}>Click me</Button>
 * 
 * // Loading state
 * <Button loading={isLoading}>Save</Button>
 * 
 * // With icons
 * <Button leftIcon={<PlusIcon />}>Add Item</Button>
 * 
 * // Icon-only with accessibility
 * <Button variant="ghost" size="icon" ariaLabel="Settings">
 *   <SettingsIcon />
 * </Button>
 * 
 * // With keyboard shortcut
 * <Button shortcut="⌘K">Search</Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      ariaLabel,
      shortcut,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const isIconOnly = size?.toString().startsWith('icon');

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-busy={loading}
        aria-disabled={isDisabled}
        className={cn(
          buttonVariants({ variant, size, fullWidth, loading, className })
        )}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <Spinner className={cn(isIconOnly ? '' : '-ml-1', 'mr-2')} />
        )}

        {/* Left icon */}
        {!loading && leftIcon && (
          <span className={cn(isIconOnly ? '' : '-ml-1')} aria-hidden="true">
            {leftIcon}
          </span>
        )}

        {/* Button content */}
        {!isIconOnly && children}
        {isIconOnly && !loading && children}

        {/* Right icon */}
        {!loading && rightIcon && (
          <span className={cn(isIconOnly ? '' : '-mr-1')} aria-hidden="true">
            {rightIcon}
          </span>
        )}

        {/* Keyboard shortcut hint */}
        {shortcut && !isIconOnly && (
          <kbd className="ml-auto pl-3 text-xs opacity-60" aria-label={`Keyboard shortcut: ${shortcut}`}>
            {shortcut}
          </kbd>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

/**
 * Button group component for organizing related buttons
 */
export interface ButtonGroupProps {
  children: React.ReactNode;
  /**
   * Orientation of the button group
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Whether buttons should be connected visually
   */
  attached?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  attached = false,
  className,
}) => {
  return (
    <div
      role="group"
      className={cn(
        'inline-flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        attached && orientation === 'horizontal' && '[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:first-child)]:-ml-px',
        attached && orientation === 'vertical' && '[&>button]:rounded-none [&>button:first-child]:rounded-t-lg [&>button:last-child]:rounded-b-lg [&>button:not(:first-child)]:-mt-px',
        !attached && orientation === 'horizontal' && 'gap-2',
        !attached && orientation === 'vertical' && 'gap-2',
        className
      )}
    >
      {children}
    </div>
  );
};

ButtonGroup.displayName = 'ButtonGroup';