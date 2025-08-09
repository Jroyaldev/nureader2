/**
 * Responsive Utilities
 * 
 * Collection of utility components and hooks for responsive design.
 * Includes breakpoint detection, responsive visibility, and layout helpers.
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

// ===== BREAKPOINT SYSTEM =====

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// ===== RESPONSIVE CONTEXT =====

interface ResponsiveContextValue {
  currentBreakpoint: Breakpoint;
  isAbove: (breakpoint: Breakpoint) => boolean;
  isBelow: (breakpoint: Breakpoint) => boolean;
  isOnly: (breakpoint: Breakpoint) => boolean;
  isBetween: (min: Breakpoint, max: Breakpoint) => boolean;
  windowWidth: number;
  windowHeight: number;
}

const ResponsiveContext = createContext<ResponsiveContextValue | undefined>(undefined);

export const useResponsive = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsive must be used within ResponsiveProvider');
  }
  return context;
};

// ===== RESPONSIVE PROVIDER =====

export interface ResponsiveProviderProps {
  children: React.ReactNode;
}

export const ResponsiveProvider: React.FC<ResponsiveProviderProps> = ({ children }) => {
  const [windowWidth, setWindowWidth] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('xs');

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
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowWidth(width);
      setWindowHeight(height);
      setCurrentBreakpoint(getBreakpoint(width));
    };

    // Initial setup
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAbove = (breakpoint: Breakpoint): boolean => {
    return windowWidth >= breakpoints[breakpoint];
  };

  const isBelow = (breakpoint: Breakpoint): boolean => {
    return windowWidth < breakpoints[breakpoint];
  };

  const isOnly = (breakpoint: Breakpoint): boolean => {
    const breakpointKeys = Object.keys(breakpoints) as Breakpoint[];
    const currentIndex = breakpointKeys.indexOf(breakpoint);
    const nextBreakpoint = breakpointKeys[currentIndex + 1];
    
    if (!nextBreakpoint) {
      return windowWidth >= breakpoints[breakpoint];
    }
    
    return windowWidth >= breakpoints[breakpoint] && windowWidth < breakpoints[nextBreakpoint];
  };

  const isBetween = (min: Breakpoint, max: Breakpoint): boolean => {
    return windowWidth >= breakpoints[min] && windowWidth < breakpoints[max];
  };

  const value: ResponsiveContextValue = {
    currentBreakpoint,
    isAbove,
    isBelow,
    isOnly,
    isBetween,
    windowWidth,
    windowHeight,
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
};

// ===== RESPONSIVE HOOKS =====

export const useBreakpoint = () => {
  const { currentBreakpoint } = useResponsive();
  return currentBreakpoint;
};

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

export const useViewport = () => {
  const { windowWidth, windowHeight } = useResponsive();
  return { width: windowWidth, height: windowHeight };
};

// ===== RESPONSIVE VISIBILITY COMPONENT =====

export interface ShowProps {
  children: React.ReactNode;
  /** Show only on these breakpoints */
  on?: Breakpoint[];
  /** Show above this breakpoint (inclusive) */
  above?: Breakpoint;
  /** Show below this breakpoint (exclusive) */
  below?: Breakpoint;
  /** Show only on this specific breakpoint */
  only?: Breakpoint;
  /** Show between these breakpoints */
  between?: [Breakpoint, Breakpoint];
  /** Fallback content when hidden */
  fallback?: React.ReactNode;
}

export const Show: React.FC<ShowProps> = ({
  children,
  on,
  above,
  below,
  only,
  between,
  fallback = null,
}) => {
  const { currentBreakpoint, isAbove, isBelow, isOnly, isBetween } = useResponsive();

  let shouldShow = false;

  if (on) {
    shouldShow = on.includes(currentBreakpoint);
  } else if (above) {
    shouldShow = isAbove(above);
  } else if (below) {
    shouldShow = isBelow(below);
  } else if (only) {
    shouldShow = isOnly(only);
  } else if (between) {
    shouldShow = isBetween(between[0], between[1]);
  }

  return shouldShow ? <>{children}</> : <>{fallback}</>;
};

// ===== RESPONSIVE HIDE COMPONENT =====

export interface HideProps {
  children: React.ReactNode;
  /** Hide only on these breakpoints */
  on?: Breakpoint[];
  /** Hide above this breakpoint (inclusive) */
  above?: Breakpoint;
  /** Hide below this breakpoint (exclusive) */
  below?: Breakpoint;
  /** Hide only on this specific breakpoint */
  only?: Breakpoint;
  /** Hide between these breakpoints */
  between?: [Breakpoint, Breakpoint];
}

export const Hide: React.FC<HideProps> = ({
  children,
  on,
  above,
  below,
  only,
  between,
}) => {
  const { currentBreakpoint, isAbove, isBelow, isOnly, isBetween } = useResponsive();

  let shouldHide = false;

  if (on) {
    shouldHide = on.includes(currentBreakpoint);
  } else if (above) {
    shouldHide = isAbove(above);
  } else if (below) {
    shouldHide = isBelow(below);
  } else if (only) {
    shouldHide = isOnly(only);
  } else if (between) {
    shouldHide = isBetween(between[0], between[1]);
  }

  return shouldHide ? null : <>{children}</>;
};

// ===== RESPONSIVE SPACER COMPONENT =====

export interface ResponsiveSpacerProps {
  /** Spacing size at different breakpoints */
  size?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  } | number;
  /** Direction of spacing */
  direction?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
}

export const ResponsiveSpacer: React.FC<ResponsiveSpacerProps & React.HTMLAttributes<HTMLDivElement>> = ({
  size = 4,
  direction = 'vertical',
  className,
  ...props
}) => {
  const getSpacingClasses = () => {
    if (typeof size === 'number') {
      return direction === 'horizontal' ? `w-${size}` : `h-${size}`;
    }

    const classes: string[] = [];
    const prefix = direction === 'horizontal' ? 'w' : 'h';

    if (size.default) classes.push(`${prefix}-${size.default}`);
    if (size.sm) classes.push(`sm:${prefix}-${size.sm}`);
    if (size.md) classes.push(`md:${prefix}-${size.md}`);
    if (size.lg) classes.push(`lg:${prefix}-${size.lg}`);
    if (size.xl) classes.push(`xl:${prefix}-${size.xl}`);
    if (size['2xl']) classes.push(`2xl:${prefix}-${size['2xl']}`);

    return classes.join(' ');
  };

  return (
    <div
      className={cn(getSpacingClasses(), className)}
      aria-hidden="true"
      {...props}
    />
  );
};

// ===== RESPONSIVE ASPECT RATIO COMPONENT =====

export interface AspectRatioProps {
  children: React.ReactNode;
  /** Aspect ratio (width/height) */
  ratio?: number;
  /** Responsive aspect ratios */
  responsiveRatio?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  /** Additional CSS classes */
  className?: string;
}

export const AspectRatio: React.FC<AspectRatioProps & React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  ratio = 16 / 9,
  responsiveRatio,
  className,
  ...props
}) => {
  const getAspectRatioStyle = (): React.CSSProperties => {
    if (responsiveRatio) {
      // For responsive ratios, we'll use CSS custom properties
      return {
        '--aspect-ratio': (responsiveRatio.default || ratio).toString(),
        aspectRatio: (responsiveRatio.default || ratio).toString(),
      } as React.CSSProperties;
    }
    
    return {
      aspectRatio: ratio.toString(),
    };
  };

  return (
    <div
      className={cn('relative w-full', className)}
      style={getAspectRatioStyle()}
      {...props}
    >
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  );
};

// ===== RESPONSIVE COLUMNS COMPONENT =====

export interface ResponsiveColumnsProps {
  children: React.ReactNode;
  /** Number of columns at different breakpoints */
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  /** Gap between columns */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Additional CSS classes */
  className?: string;
}

export const ResponsiveColumns: React.FC<ResponsiveColumnsProps & React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  columns = { default: 1, md: 2, lg: 3 },
  gap = 'md',
  className,
  ...props
}) => {
  const getColumnClasses = () => {
    const classes: string[] = ['columns-1']; // Default

    if (columns.default) classes[0] = `columns-${columns.default}`;
    if (columns.sm) classes.push(`sm:columns-${columns.sm}`);
    if (columns.md) classes.push(`md:columns-${columns.md}`);
    if (columns.lg) classes.push(`lg:columns-${columns.lg}`);
    if (columns.xl) classes.push(`xl:columns-${columns.xl}`);
    if (columns['2xl']) classes.push(`2xl:columns-${columns['2xl']}`);

    return classes.join(' ');
  };

  const getGapClass = () => {
    const gapMap = {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
      '2xl': 'gap-12',
    };
    return `column-${gapMap[gap]}`;
  };

  return (
    <div
      className={cn(
        getColumnClasses(),
        getGapClass(),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};