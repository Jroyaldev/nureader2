/**
 * TabBar Component
 * 
 * Animated tab bar with smooth indicator transitions and touch-optimized interactions.
 * Supports horizontal scrolling for many tabs and customizable styling.
 */

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// ===== TAB ITEM =====

export interface TabItemProps {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon component (optional) */
  icon?: React.ReactNode;
  /** Badge content */
  badge?: string | number;
  /** Disabled state */
  disabled?: boolean;
  /** Custom className */
  className?: string;
}

// ===== TAB BAR =====

export interface TabBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tab items */
  items: TabItemProps[];
  /** Currently active tab ID */
  activeId: string;
  /** Change handler */
  onChange: (id: string) => void;
  /** Tab bar variant */
  variant?: 'default' | 'pills' | 'underline' | 'buttons';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Allow scrolling when tabs overflow */
  scrollable?: boolean;
  /** Center tabs when they don't fill the container */
  centered?: boolean;
  /** Full width tabs */
  fullWidth?: boolean;
  /** Show indicator animation */
  showIndicator?: boolean;
  /** Indicator color */
  indicatorColor?: 'primary' | 'secondary' | 'accent';
  /** Animation duration in ms */
  animationDuration?: number;
}

const TabBar = React.forwardRef<HTMLDivElement, TabBarProps>(
  ({ 
    className,
    items,
    activeId,
    onChange,
    variant = 'default',
    size = 'md',
    scrollable = true,
    centered = false,
    fullWidth = false,
    showIndicator = true,
    indicatorColor = 'primary',
    animationDuration = 200,
    ...props 
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
    const [isScrollable, setIsScrollable] = useState(false);

    // Update indicator position
    useEffect(() => {
      if (!showIndicator || !containerRef.current) return;

      const activeTab = containerRef.current.querySelector(`[data-tab-id="${activeId}"]`) as HTMLElement;
      if (!activeTab) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      
      const left = tabRect.left - containerRect.left + containerRef.current.scrollLeft;
      const width = tabRect.width;

      setIndicatorStyle({
        left: `${left}px`,
        width: `${width}px`,
        transition: `all ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      });
    }, [activeId, items, showIndicator, animationDuration]);

    // Check if scrolling is needed
    useEffect(() => {
      if (!scrollable || !containerRef.current) return;

      const checkScrollable = () => {
        if (containerRef.current) {
          const { scrollWidth, clientWidth } = containerRef.current;
          setIsScrollable(scrollWidth > clientWidth);
        }
      };

      checkScrollable();
      window.addEventListener('resize', checkScrollable);
      return () => window.removeEventListener('resize', checkScrollable);
    }, [scrollable, items]);

    // Scroll active tab into view
    useEffect(() => {
      if (!scrollable || !containerRef.current) return;

      const activeTab = containerRef.current.querySelector(`[data-tab-id="${activeId}"]`) as HTMLElement;
      if (!activeTab || !activeTab.scrollIntoView) return;

      activeTab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }, [activeId, scrollable]);

    // Get size classes
    const getSizeClasses = () => {
      const sizeMap = {
        sm: {
          container: 'h-10',
          tab: 'px-3 py-2 text-sm',
          icon: 'w-4 h-4',
        },
        md: {
          container: 'h-12',
          tab: 'px-4 py-3 text-sm',
          icon: 'w-4 h-4',
        },
        lg: {
          container: 'h-14',
          tab: 'px-6 py-4 text-base',
          icon: 'w-5 h-5',
        },
      };
      return sizeMap[size];
    };

    // Get variant classes
    const getVariantClasses = () => {
      const variants = {
        default: {
          container: 'bg-muted/30 rounded-lg p-1',
          tab: 'rounded-md transition-all duration-200',
          active: 'bg-background text-foreground shadow-sm',
          inactive: 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
        },
        pills: {
          container: 'bg-transparent',
          tab: 'rounded-full transition-all duration-200 border border-transparent',
          active: 'bg-primary text-primary-foreground border-primary',
          inactive: 'text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border',
        },
        underline: {
          container: 'bg-transparent border-b border-border',
          tab: 'transition-all duration-200 border-b-2 border-transparent -mb-px',
          active: 'text-foreground border-primary',
          inactive: 'text-muted-foreground hover:text-foreground hover:border-muted',
        },
        buttons: {
          container: 'bg-transparent gap-2',
          tab: 'rounded-md transition-all duration-200 border',
          active: 'bg-primary text-primary-foreground border-primary',
          inactive: 'bg-background text-foreground border-border hover:bg-muted/50',
        },
      };
      return variants[variant];
    };

    const sizeClasses = getSizeClasses();
    const variantClasses = getVariantClasses();

    const handleTabClick = (id: string, disabled?: boolean) => {
      if (!disabled) {
        onChange(id);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full',
          className
        )}
        {...props}
      >
        <div
          ref={containerRef}
          className={cn(
            'relative flex items-center',
            sizeClasses.container,
            variantClasses.container,
            scrollable && isScrollable && 'overflow-x-auto scrollbar-hide',
            centered && !fullWidth && 'justify-center',
            fullWidth && 'w-full',
          )}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Tabs */}
          {items.map((item) => {
            const isActive = item.id === activeId;
            
            return (
              <button
                key={item.id}
                data-tab-id={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${item.id}`}
                disabled={item.disabled}
                onClick={() => handleTabClick(item.id, item.disabled)}
                className={cn(
                  'relative flex items-center justify-center gap-2',
                  'font-medium whitespace-nowrap',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  'touch-manipulation select-none',
                  sizeClasses.tab,
                  variantClasses.tab,
                  fullWidth && 'flex-1',
                  isActive ? variantClasses.active : variantClasses.inactive,
                  item.disabled && 'opacity-50 cursor-not-allowed',
                  item.className
                )}
              >
                {/* Icon */}
                {item.icon && (
                  <span className={cn('flex-shrink-0', sizeClasses.icon)}>
                    {item.icon}
                  </span>
                )}
                
                {/* Label */}
                <span className="truncate">{item.label}</span>
                
                {/* Badge */}
                {item.badge && (
                  <span className={cn(
                    'ml-1 px-1.5 py-0.5',
                    'bg-muted text-muted-foreground',
                    'text-xs font-medium rounded-full',
                    'min-w-[18px] h-[18px]',
                    'flex items-center justify-center',
                    isActive && 'bg-primary-foreground/20 text-primary-foreground'
                  )}>
                    {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
          
          {/* Animated indicator */}
          {showIndicator && variant !== 'pills' && variant !== 'buttons' && (
            <div
              className={cn(
                'absolute bottom-0 h-0.5 rounded-full',
                indicatorColor === 'primary' && 'bg-primary',
                indicatorColor === 'secondary' && 'bg-secondary',
                indicatorColor === 'accent' && 'bg-accent',
                variant === 'underline' && 'bottom-0',
                variant === 'default' && 'bottom-1',
              )}
              style={indicatorStyle}
            />
          )}
        </div>
        
        {/* Scroll fade indicators */}
        {scrollable && isScrollable && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          </>
        )}
      </div>
    );
  }
);

TabBar.displayName = 'TabBar';

export { TabBar };
export type { TabItemProps };