import React, { forwardRef, ButtonHTMLAttributes, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button component variants using class-variance-authority
 * Provides consistent styling across all button types with enhanced accessibility
 */
const buttonVariants = cva(
  // Base styles with enhanced accessibility, animations, and Inter font
  'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none relative overflow-hidden active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none font-inter touch-manipulation',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white active:bg-blue-700 focus-visible:ring-blue-500 shadow-md active:shadow-lg',
        secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 active:bg-gray-200 dark:active:bg-gray-700 focus-visible:ring-gray-500 border border-gray-200 dark:border-gray-700',
        outline: 'border-2 border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-300 active:bg-gray-50 dark:active:bg-gray-800 focus-visible:ring-gray-500',
        ghost: 'bg-transparent text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800 focus-visible:ring-gray-500',
        danger: 'bg-red-600 text-white active:bg-red-700 focus-visible:ring-red-500 shadow-md active:shadow-lg',
        success: 'bg-green-600 text-white active:bg-green-700 focus-visible:ring-green-500 shadow-md active:shadow-lg',
        warning: 'bg-yellow-500 text-white active:bg-yellow-600 focus-visible:ring-yellow-500 shadow-md active:shadow-lg',
        link: 'text-blue-600 dark:text-blue-400 underline-offset-4 active:underline focus-visible:ring-blue-500 bg-transparent p-0 h-auto',
        glass: 'bg-white/10 dark:bg-white/5 text-gray-900 dark:text-white backdrop-blur-md border border-white/20 dark:border-white/10 active:bg-white/20 dark:active:bg-white/10 shadow-lg active:shadow-xl focus-visible:ring-white/50',
        'glass-primary': 'bg-blue-500/20 text-blue-900 dark:text-blue-100 backdrop-blur-md border border-blue-300/30 dark:border-blue-400/20 active:bg-blue-500/30 shadow-lg active:shadow-xl focus-visible:ring-blue-400/50',
        'glass-danger': 'bg-red-500/20 text-red-900 dark:text-red-100 backdrop-blur-md border border-red-300/30 dark:border-red-400/20 active:bg-red-500/30 shadow-lg active:shadow-xl focus-visible:ring-red-400/50',
      },
      size: {
        xs: 'h-7 px-2 text-xs gap-1 rounded-md',
        sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
        md: 'h-10 px-4 py-2 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2',
        xl: 'h-14 px-8 text-lg gap-3 rounded-xl',
        icon: 'h-10 w-10 p-0',
        'icon-xs': 'h-7 w-7 p-0 rounded-md',
        'icon-sm': 'h-8 w-8 p-0 rounded-md',
        'icon-lg': 'h-12 w-12 p-0',
        'icon-xl': 'h-14 w-14 p-0 rounded-xl',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      loading: {
        true: 'cursor-wait',
        false: '',
      },
      gradient: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false,
      gradient: false,
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
   * Keyboard shortcut hint (displayed visually)
   */
  shortcut?: string;
  /**
   * Keyboard shortcut key combination for automatic handling
   */
  shortcutKey?: string;
  /**
   * Additional description for screen readers
   */
  ariaDescribedBy?: string;
  /**
   * Pulse animation for attention-grabbing buttons
   */
  pulse?: boolean;
  /**
   * Gradient background for enhanced visual appeal
   */
  gradient?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Button component with comprehensive accessibility support and keyboard shortcuts
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
 * <Button shortcut="⌘K" shortcutKey="cmd+k" onClick={handleSearch}>Search</Button>
 * 
 * // Pulsing button for attention
 * <Button pulse variant="danger">Important Action</Button>
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
      ariaDescribedBy,
      shortcut,
      shortcutKey,
      pulse = false,
      gradient = false,
      children,
      type = 'button',
      onClick,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const isIconOnly = size?.toString().startsWith('icon');

    // Handle keyboard shortcuts
    useEffect(() => {
      if (!shortcutKey || isDisabled || !onClick) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        const keys = shortcutKey.toLowerCase().split('+');
        const hasCtrl = keys.includes('ctrl') && (event.ctrlKey || event.metaKey);
        const hasShift = keys.includes('shift') && event.shiftKey;
        const hasAlt = keys.includes('alt') && event.altKey;
        const hasCmd = keys.includes('cmd') && event.metaKey;
        
        const keyPressed = event.key.toLowerCase();
        const targetKey = keys[keys.length - 1]; // Last key is the main key
        
        const modifiersMatch = 
          (!keys.includes('ctrl') || hasCtrl) &&
          (!keys.includes('shift') || hasShift) &&
          (!keys.includes('alt') || hasAlt) &&
          (!keys.includes('cmd') || hasCmd);

        if (modifiersMatch && keyPressed === targetKey) {
          event.preventDefault();
          onClick(event as any);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [shortcutKey, isDisabled, onClick]);

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        aria-disabled={isDisabled}
        onClick={onClick}
        className={cn(
          buttonVariants({ variant, size, fullWidth, loading, gradient }),
          pulse && 'animate-pulse',
          gradient && variant === 'primary' && 'bg-gradient-to-r from-blue-600 to-purple-600 active:from-blue-700 active:to-purple-700',
          gradient && variant === 'danger' && 'bg-gradient-to-r from-red-600 to-pink-600 active:from-red-700 active:to-pink-700',
          gradient && variant === 'success' && 'bg-gradient-to-r from-green-600 to-emerald-600 active:from-green-700 active:to-emerald-700',
          gradient && variant === 'warning' && 'bg-gradient-to-r from-yellow-500 to-orange-500 active:from-yellow-600 active:to-orange-600',
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <Spinner className={cn(isIconOnly ? '' : 'mr-2')} />
        )}

        {/* Left icon */}
        {!loading && leftIcon && (
          <span className={cn(isIconOnly ? '' : 'mr-2')} aria-hidden="true">
            {leftIcon}
          </span>
        )}

        {/* Button content */}
        {!isIconOnly && children}
        {isIconOnly && !loading && children}

        {/* Right icon */}
        {!loading && rightIcon && (
          <span className={cn(isIconOnly ? '' : 'ml-2')} aria-hidden="true">
            {rightIcon}
          </span>
        )}

        {/* Keyboard shortcut hint */}
        {shortcut && !isIconOnly && !loading && (
          <kbd className="ml-auto pl-3 text-xs opacity-60 font-mono bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded" aria-label={`Keyboard shortcut: ${shortcut}`}>
            {shortcut}
          </kbd>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

/**
 * Button group component for organizing related buttons with enhanced accessibility
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
   * Size variant for all buttons in the group
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Variant for all buttons in the group
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'link';
  /**
   * Accessible label for the button group
   */
  ariaLabel?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  attached = false,
  size,
  variant,
  ariaLabel,
  className,
}) => {
  // Clone children to pass down size and variant props
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement<ButtonProps>(child) && child.type === Button) {
      return React.cloneElement(child, {
        size: child.props.size || size,
        variant: child.props.variant || variant,
        ...child.props,
      } as ButtonProps);
    }
    return child;
  });

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        // Attached horizontal styling
        attached && orientation === 'horizontal' && [
          '[&>button]:rounded-none',
          '[&>button:first-child]:rounded-l-lg',
          '[&>button:last-child]:rounded-r-lg',
          '[&>button:not(:first-child)]:-ml-px',
          '[&>button:not(:first-child)]:border-l-0',
          '[&>button]:focus:z-10',
          '[&>button]:active:z-10',
        ],
        // Attached vertical styling
        attached && orientation === 'vertical' && [
          '[&>button]:rounded-none',
          '[&>button:first-child]:rounded-t-lg',
          '[&>button:last-child]:rounded-b-lg',
          '[&>button:not(:first-child)]:-mt-px',
          '[&>button:not(:first-child)]:border-t-0',
          '[&>button]:focus:z-10',
          '[&>button]:active:z-10',
        ],
        // Non-attached spacing
        !attached && orientation === 'horizontal' && 'gap-2',
        !attached && orientation === 'vertical' && 'gap-2',
        className
      )}
    >
      {enhancedChildren}
    </div>
  );
};

ButtonGroup.displayName = 'ButtonGroup';