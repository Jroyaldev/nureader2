/**
 * Bottom Navigation Component
 * 
 * Mobile-first bottom navigation with touch-optimized targets and smooth animations.
 * Designed for primary navigation on mobile devices.
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ===== BOTTOM NAVIGATION ITEM =====

export interface BottomNavigationItemProps {
  /** Unique identifier for the item */
  id: string;
  /** Display label */
  label: string;
  /** Icon component or element */
  icon: React.ReactNode;
  /** Active icon variant (optional) */
  activeIcon?: React.ReactNode;
  /** Whether this item is currently active */
  active?: boolean;
  /** Badge content (number or text) */
  badge?: string | number;
  /** Click handler */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom className */
  className?: string;
}

const BottomNavigationItem = React.forwardRef<HTMLButtonElement, BottomNavigationItemProps>(
  ({ 
    id,
    label, 
    icon, 
    activeIcon, 
    active = false, 
    badge, 
    onClick, 
    disabled = false,
    className,
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={active}
        aria-controls={`panel-${id}`}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          // Base styles
          'relative flex flex-col items-center justify-center',
          'min-h-[64px] px-2 py-1',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          'touch-manipulation select-none',
          
          // Interactive states
          active ? [
            'text-primary',
            'scale-105',
          ] : [
            'text-muted-foreground',
            'hover:text-foreground hover:scale-105',
            'active:scale-95',
          ],
          
          // Disabled state
          disabled && [
            'opacity-50',
            'cursor-not-allowed',
            'hover:scale-100 active:scale-100',
          ],
          
          className
        )}
        {...props}
      >
        {/* Icon container with animation */}
        <div className={cn(
          'relative flex items-center justify-center',
          'w-6 h-6 mb-1',
          'transition-transform duration-200 ease-out',
          active && 'transform -translate-y-0.5'
        )}>
          {active && activeIcon ? activeIcon : icon}
          
          {/* Badge */}
          {badge && (
            <div className={cn(
              'absolute -top-1 -right-1',
              'min-w-[16px] h-4 px-1',
              'bg-error text-white',
              'text-xs font-medium leading-none',
              'rounded-full',
              'flex items-center justify-center',
              'animate-in zoom-in-50 duration-200'
            )}>
              {typeof badge === 'number' && badge > 99 ? '99+' : badge}
            </div>
          )}
        </div>
        
        {/* Label */}
        <span className={cn(
          'text-xs font-medium leading-tight',
          'transition-all duration-200 ease-out',
          'max-w-[64px] truncate',
          active && 'font-semibold'
        )}>
          {label}
        </span>
        
        {/* Active indicator */}
        {active && (
          <div className={cn(
            'absolute top-0 left-1/2 transform -translate-x-1/2',
            'w-8 h-0.5 bg-primary rounded-full',
            'animate-in slide-in-from-top-2 duration-300'
          )} />
        )}
      </button>
    );
  }
);

BottomNavigationItem.displayName = 'BottomNavigationItem';

// ===== BOTTOM NAVIGATION =====

export interface BottomNavigationProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Navigation items */
  items: BottomNavigationItemProps[];
  /** Currently active item ID */
  activeId?: string;
  /** Change handler */
  onChange?: (id: string) => void;
  /** Show labels */
  showLabels?: boolean;
  /** Variant style */
  variant?: 'default' | 'floating' | 'minimal';
  /** Background blur effect */
  blur?: boolean;
  /** Safe area padding for devices with home indicator */
  safeArea?: boolean;
}

const BottomNavigation = React.forwardRef<HTMLDivElement, BottomNavigationProps>(
  ({ 
    className,
    items,
    activeId,
    onChange,
    showLabels = true,
    variant = 'default',
    blur = true,
    safeArea = true,
    ...props 
  }, ref) => {
    const handleItemClick = (id: string) => {
      if (onChange) {
        onChange(id);
      }
    };

    // Generate variant classes
    const getVariantClasses = () => {
      const variants = {
        default: [
          'bg-background/95 border-t border-border',
          blur && 'backdrop-blur-md backdrop-saturate-150',
        ],
        floating: [
          'bg-background/90 border border-border',
          'mx-4 mb-4 rounded-2xl shadow-lg',
          blur && 'backdrop-blur-lg backdrop-saturate-180',
        ],
        minimal: [
          'bg-transparent',
        ],
      };
      
      return variants[variant].filter(Boolean);
    };

    return (
      <nav
        ref={ref}
        role="tablist"
        aria-label="Bottom navigation"
        className={cn(
          // Base styles
          'fixed bottom-0 left-0 right-0 z-50',
          'flex items-center justify-around',
          
          // Variant styles
          ...getVariantClasses(),
          
          // Safe area padding
          safeArea && 'pb-safe-area-inset-bottom',
          
          // Animation
          'animate-in slide-in-from-bottom-full duration-300',
          
          className
        )}
        {...props}
      >
        {items.map((item) => (
          <BottomNavigationItem
            key={item.id}
            {...item}
            active={item.id === activeId}
            onClick={() => handleItemClick(item.id)}
            className={cn(
              'flex-1 max-w-[120px]',
              !showLabels && 'min-h-[56px]'
            )}
          />
        ))}
      </nav>
    );
  }
);

BottomNavigation.displayName = 'BottomNavigation';

export { BottomNavigation, BottomNavigationItem };