import React, { useState, useEffect, createContext, useContext } from 'react';
import { cn } from '@/utils';
import { Button } from '../Button/Button';

/**
 * Breakpoint system for responsive design
 */
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Hook to get current breakpoint
 */
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs');

  useEffect(() => {
    const getBreakpoint = (width: number): Breakpoint => {
      if (width >= breakpoints['2xl']) return '2xl';
      if (width >= breakpoints.xl) return 'xl';
      if (width >= breakpoints.lg) return 'lg';
      if (width >= breakpoints.md) return 'md';
      if (width >= breakpoints.sm) return 'sm';
      return 'xs';
    };

    const handleResize = () => {
      setBreakpoint(getBreakpoint(window.innerWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};

/**
 * Hook to check if current breakpoint is at least the specified size
 */
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);
    
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};

/**
 * Container component with responsive max-width
 */
export interface ContainerProps {
  children: React.ReactNode;
  /**
   * Maximum width variant
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /**
   * Whether to add padding
   */
  padding?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'lg',
  padding = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        padding && 'px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  );
};

Container.displayName = 'Container';

/**
 * Grid component for responsive layouts
 */
export interface GridProps {
  children: React.ReactNode;
  /**
   * Number of columns at different breakpoints
   */
  cols?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  /**
   * Gap between grid items
   */
  gap?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  cols = 1,
  gap = 4,
  className,
}) => {
  const getGridCols = () => {
    if (typeof cols === 'number') {
      return `grid-cols-${cols}`;
    }
    
    const classes = [];
    if (cols.xs) classes.push(`grid-cols-${cols.xs}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    
    return classes.join(' ');
  };

  return (
    <div
      className={cn(
        'grid',
        getGridCols(),
        `gap-${gap}`,
        className
      )}
    >
      {children}
    </div>
  );
};

Grid.displayName = 'Grid';

/**
 * Stack component for vertical or horizontal layouts
 */
export interface StackProps {
  children: React.ReactNode;
  /**
   * Direction of the stack
   */
  direction?: 'horizontal' | 'vertical';
  /**
   * Spacing between items
   */
  spacing?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
  /**
   * Alignment of items
   */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /**
   * Justification of items
   */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /**
   * Whether to wrap items
   */
  wrap?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'vertical',
  spacing = 4,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
}) => {
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };

  return (
    <div
      className={cn(
        'flex',
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        direction === 'horizontal' ? `gap-x-${spacing}` : `gap-y-${spacing}`,
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        className
      )}
    >
      {children}
    </div>
  );
};

Stack.displayName = 'Stack';

/**
 * Sidebar layout context
 */
interface SidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};

/**
 * Sidebar layout component
 */
export interface SidebarLayoutProps {
  children: React.ReactNode;
  /**
   * Sidebar content
   */
  sidebar: React.ReactNode;
  /**
   * Position of the sidebar
   */
  position?: 'left' | 'right';
  /**
   * Width of the sidebar
   */
  sidebarWidth?: string;
  /**
   * Whether sidebar is collapsible on mobile
   */
  collapsible?: boolean;
  /**
   * Initial open state
   */
  defaultOpen?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  children,
  sidebar,
  position = 'left',
  sidebarWidth = '256px',
  collapsible = true,
  defaultOpen = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      <div className={cn('flex h-full', className)}>
        {/* Mobile overlay */}
        {isMobile && isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={close}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'transition-all duration-300 z-50',
            isMobile ? 'fixed inset-y-0' : 'relative',
            position === 'left' ? 'left-0' : 'right-0',
            isOpen ? 'translate-x-0' : position === 'left' ? '-translate-x-full' : 'translate-x-full',
            'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700'
          )}
          style={{ width: sidebarWidth }}
        >
          {sidebar}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {collapsible && (
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-40 lg:hidden"
              onClick={toggle}
              ariaLabel="Toggle sidebar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </Button>
          )}
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
};

SidebarLayout.displayName = 'SidebarLayout';

/**
 * Responsive component that shows/hides based on breakpoints
 */
export interface ResponsiveProps {
  children: React.ReactNode;
  /**
   * Show on these breakpoints
   */
  show?: Breakpoint[];
  /**
   * Hide on these breakpoints
   */
  hide?: Breakpoint[];
}

export const Responsive: React.FC<ResponsiveProps> = ({
  children,
  show,
  hide,
}) => {
  const currentBreakpoint = useBreakpoint();
  
  if (show && !show.includes(currentBreakpoint)) {
    return null;
  }
  
  if (hide && hide.includes(currentBreakpoint)) {
    return null;
  }
  
  return <>{children}</>;
};

Responsive.displayName = 'Responsive';

/**
 * Spacer component for adding space between elements
 */
export interface SpacerProps {
  /**
   * Size of the spacer
   */
  size?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32;
  /**
   * Direction of the spacer
   */
  direction?: 'horizontal' | 'vertical';
}

export const Spacer: React.FC<SpacerProps> = ({
  size = 4,
  direction = 'vertical',
}) => {
  return (
    <div
      className={
        direction === 'horizontal' 
          ? `w-${size}` 
          : `h-${size}`
      }
      aria-hidden="true"
    />
  );
};

Spacer.displayName = 'Spacer';