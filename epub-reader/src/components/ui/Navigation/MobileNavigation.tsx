/**
 * Mobile Navigation Patterns
 * 
 * Collection of mobile-specific navigation patterns with touch-optimized interactions.
 * Includes hamburger menu, mobile header, and navigation utilities.
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Drawer } from './Drawer';

// ===== HAMBURGER MENU =====

export interface HamburgerMenuProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the menu is open */
  open: boolean;
  /** Animation variant */
  variant?: 'default' | 'arrow' | 'cross';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  color?: 'default' | 'primary' | 'secondary';
}

const HamburgerMenu = React.forwardRef<HTMLButtonElement, HamburgerMenuProps>(
  ({ 
    className,
    open,
    variant = 'default',
    size = 'md',
    color = 'default',
    ...props 
  }, ref) => {
    // Get size classes
    const getSizeClasses = () => {
      const sizeMap = {
        sm: { button: 'w-8 h-8', line: 'h-0.5' },
        md: { button: 'w-10 h-10', line: 'h-0.5' },
        lg: { button: 'w-12 h-12', line: 'h-1' },
      };
      return sizeMap[size];
    };

    // Get color classes
    const getColorClasses = () => {
      const colorMap = {
        default: 'text-foreground',
        primary: 'text-primary',
        secondary: 'text-secondary',
      };
      return colorMap[color];
    };

    const sizeClasses = getSizeClasses();

    return (
      <button
        ref={ref}
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className={cn(
          'relative flex items-center justify-center',
          'rounded-md transition-colors duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          'hover:bg-muted/50 active:bg-muted',
          'touch-manipulation select-none',
          sizeClasses.button,
          getColorClasses(),
          className
        )}
        {...props}
      >
        <div className="relative w-5 h-4 flex flex-col justify-between">
          {/* Top line */}
          <span
            className={cn(
              'block w-full bg-current rounded-full transition-all duration-300 ease-in-out',
              sizeClasses.line,
              open && variant === 'default' && 'rotate-45 translate-y-1.5',
              open && variant === 'arrow' && 'rotate-45 translate-y-1.5 w-3',
              open && variant === 'cross' && 'rotate-45 translate-y-1.5',
            )}
          />
          
          {/* Middle line */}
          <span
            className={cn(
              'block w-full bg-current rounded-full transition-all duration-300 ease-in-out',
              sizeClasses.line,
              open && 'opacity-0',
            )}
          />
          
          {/* Bottom line */}
          <span
            className={cn(
              'block w-full bg-current rounded-full transition-all duration-300 ease-in-out',
              sizeClasses.line,
              open && variant === 'default' && '-rotate-45 -translate-y-1.5',
              open && variant === 'arrow' && '-rotate-45 -translate-y-1.5 w-3',
              open && variant === 'cross' && '-rotate-45 -translate-y-1.5',
            )}
          />
        </div>
      </button>
    );
  }
);

HamburgerMenu.displayName = 'HamburgerMenu';

// ===== MOBILE HEADER =====

export interface MobileHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Header title */
  title?: string;
  /** Left side content */
  leftContent?: React.ReactNode;
  /** Right side content */
  rightContent?: React.ReactNode;
  /** Show back button */
  showBackButton?: boolean;
  /** Back button handler */
  onBackClick?: () => void;
  /** Show menu button */
  showMenuButton?: boolean;
  /** Menu button handler */
  onMenuClick?: () => void;
  /** Menu open state */
  menuOpen?: boolean;
  /** Header variant */
  variant?: 'default' | 'transparent' | 'blur';
  /** Sticky header */
  sticky?: boolean;
  /** Safe area padding */
  safeArea?: boolean;
  /** Border bottom */
  showBorder?: boolean;
}

const MobileHeader = React.forwardRef<HTMLDivElement, MobileHeaderProps>(
  ({ 
    className,
    title,
    leftContent,
    rightContent,
    showBackButton = false,
    onBackClick,
    showMenuButton = false,
    onMenuClick,
    menuOpen = false,
    variant = 'default',
    sticky = true,
    safeArea = true,
    showBorder = true,
    children,
    ...props 
  }, ref) => {
    // Get variant classes
    const getVariantClasses = () => {
      const variants = {
        default: 'bg-background',
        transparent: 'bg-transparent',
        blur: 'bg-background/80 backdrop-blur-md backdrop-saturate-150',
      };
      return variants[variant];
    };

    return (
      <header
        ref={ref}
        className={cn(
          'relative z-40 w-full',
          getVariantClasses(),
          sticky && 'sticky top-0',
          safeArea && 'pt-safe-area-inset-top',
          showBorder && 'border-b border-border',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left side */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {showBackButton && (
              <button
                type="button"
                onClick={onBackClick}
                className={cn(
                  'flex items-center justify-center w-10 h-10',
                  'rounded-md transition-colors duration-200',
                  'hover:bg-muted/50 active:bg-muted',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  'touch-manipulation select-none'
                )}
                aria-label="Go back"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            
            {showMenuButton && (
              <HamburgerMenu
                open={menuOpen}
                onClick={onMenuClick}
                size="md"
              />
            )}
            
            {leftContent}
          </div>

          {/* Center - Title */}
          {title && (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-lg font-semibold text-foreground truncate max-w-[200px]">
                {title}
              </h1>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
            {rightContent}
          </div>
        </div>
        
        {children}
      </header>
    );
  }
);

MobileHeader.displayName = 'MobileHeader';

// ===== MOBILE MENU =====

export interface MobileMenuProps {
  /** Whether the menu is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Menu items */
  items: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    disabled?: boolean;
    divider?: boolean;
  }>;
  /** Menu header content */
  header?: React.ReactNode;
  /** Menu footer content */
  footer?: React.ReactNode;
  /** Drawer position */
  position?: 'left' | 'right';
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  open,
  onClose,
  items,
  header,
  footer,
  position = 'left',
}) => {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      position={position}
      size="md"
      enableGestures
      safeArea
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        {header && (
          <div className="flex-shrink-0 p-4 border-b border-border">
            {header}
          </div>
        )}

        {/* Menu items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.divider && (
                <div className="my-2 border-t border-border" />
              )}
              
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                  }
                  onClose();
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3',
                  'text-left transition-colors duration-200',
                  'hover:bg-muted/50 active:bg-muted',
                  'focus:outline-none focus-visible:bg-muted/50',
                  'touch-manipulation select-none',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {/* Icon */}
                {item.icon && (
                  <span className="flex-shrink-0 w-5 h-5 text-muted-foreground">
                    {item.icon}
                  </span>
                )}
                
                {/* Label */}
                <span className="flex-1 font-medium text-foreground">
                  {item.label}
                </span>
                
                {/* Badge */}
                {item.badge && (
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    'bg-muted text-muted-foreground',
                    'min-w-[20px] h-5 flex items-center justify-center'
                  )}>
                    {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 p-4 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </Drawer>
  );
};

MobileMenu.displayName = 'MobileMenu';

export { HamburgerMenu, MobileHeader, MobileMenu };