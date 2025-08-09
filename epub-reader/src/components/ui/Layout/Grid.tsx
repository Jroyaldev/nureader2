/**
 * Responsive Grid System
 * 
 * Mobile-first responsive grid system with flexible columns and gaps.
 * Supports CSS Grid and Flexbox layouts with consistent breakpoints.
 * Enhanced with auto-fit, auto-fill, and custom grid templates.
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ===== GRID COMPONENT =====

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns at different breakpoints */
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  } | number;
  /** Gap between grid items with responsive support */
  gap?: {
    default?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    sm?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    md?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    lg?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    xl?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  } | 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Alignment of grid items */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Justification of grid items */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** Use CSS Grid instead of Flexbox */
  useGrid?: boolean;
  /** Auto-fit columns with minimum width */
  autoFit?: string;
  /** Auto-fill columns with minimum width */
  autoFill?: string;
  /** Custom grid template columns */
  template?: string;
  /** Responsive grid template */
  responsiveTemplate?: {
    default?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
  };
  children: React.ReactNode;
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ 
    className, 
    cols = 1, 
    gap = 'md', 
    align = 'stretch', 
    justify = 'start',
    useGrid = true,
    autoFit,
    autoFill,
    template,
    responsiveTemplate,
    children, 
    ...props 
  }, ref) => {
    // Generate responsive column classes
    const getColumnClasses = () => {
      // Handle custom templates first
      if (template || responsiveTemplate) {
        return ''; // Custom templates will be handled via style prop
      }
      
      // Handle auto-fit and auto-fill
      if (autoFit || autoFill) {
        return ''; // Auto layouts will be handled via style prop
      }
      
      if (typeof cols === 'number') {
        return useGrid ? `grid-cols-${cols}` : '';
      }

      const classes: string[] = [];
      
      if (cols.default) {
        classes.push(useGrid ? `grid-cols-${cols.default}` : '');
      }
      if (cols.sm) {
        classes.push(useGrid ? `sm:grid-cols-${cols.sm}` : '');
      }
      if (cols.md) {
        classes.push(useGrid ? `md:grid-cols-${cols.md}` : '');
      }
      if (cols.lg) {
        classes.push(useGrid ? `lg:grid-cols-${cols.lg}` : '');
      }
      if (cols.xl) {
        classes.push(useGrid ? `xl:grid-cols-${cols.xl}` : '');
      }
      if (cols['2xl']) {
        classes.push(useGrid ? `2xl:grid-cols-${cols['2xl']}` : '');
      }

      return classes.filter(Boolean).join(' ');
    };

    // Generate responsive gap classes
    const getGapClasses = () => {
      const gapMap = {
        none: 'gap-0',
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
        '2xl': 'gap-12',
      };
      
      if (typeof gap === 'string') {
        return gapMap[gap];
      }
      
      const classes: string[] = [];
      if (gap.default) classes.push(gapMap[gap.default]);
      if (gap.sm) classes.push(`sm:${gapMap[gap.sm]}`);
      if (gap.md) classes.push(`md:${gapMap[gap.md]}`);
      if (gap.lg) classes.push(`lg:${gapMap[gap.lg]}`);
      if (gap.xl) classes.push(`xl:${gapMap[gap.xl]}`);
      
      return classes.join(' ');
    };

    // Generate alignment classes
    const getAlignClass = () => {
      if (useGrid) {
        const alignMap = {
          start: 'items-start',
          center: 'items-center',
          end: 'items-end',
          stretch: 'items-stretch',
        };
        return alignMap[align];
      } else {
        const alignMap = {
          start: 'items-start',
          center: 'items-center',
          end: 'items-end',
          stretch: 'items-stretch',
        };
        return alignMap[align];
      }
    };

    // Generate justification classes
    const getJustifyClass = () => {
      if (useGrid) {
        const justifyMap = {
          start: 'justify-items-start',
          center: 'justify-items-center',
          end: 'justify-items-end',
          between: 'justify-items-stretch',
          around: 'justify-items-stretch',
          evenly: 'justify-items-stretch',
        };
        return justifyMap[justify];
      } else {
        const justifyMap = {
          start: 'justify-start',
          center: 'justify-center',
          end: 'justify-end',
          between: 'justify-between',
          around: 'justify-around',
          evenly: 'justify-evenly',
        };
        return justifyMap[justify];
      }
    };

    // Generate custom grid template styles
    const getGridTemplateStyle = () => {
      const style: React.CSSProperties = {};
      
      if (autoFit) {
        style.gridTemplateColumns = `repeat(auto-fit, minmax(${autoFit}, 1fr))`;
      } else if (autoFill) {
        style.gridTemplateColumns = `repeat(auto-fill, minmax(${autoFill}, 1fr))`;
      } else if (template) {
        style.gridTemplateColumns = template;
      }
      
      return Object.keys(style).length > 0 ? style : undefined;
    };

    const baseClass = useGrid ? 'grid' : 'flex flex-wrap';

    return (
      <div
        ref={ref}
        className={cn(
          baseClass,
          getColumnClasses(),
          getGapClasses(),
          getAlignClass(),
          getJustifyClass(),
          className
        )}
        style={getGridTemplateStyle()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';

// ===== GRID ITEM COMPONENT =====

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Column span at different breakpoints */
  colSpan?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  } | number;
  /** Row span at different breakpoints */
  rowSpan?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  } | number;
  /** Column start position */
  colStart?: number;
  /** Row start position */
  rowStart?: number;
  children: React.ReactNode;
}

const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ 
    className, 
    colSpan, 
    rowSpan, 
    colStart, 
    rowStart, 
    children, 
    ...props 
  }, ref) => {
    // Generate column span classes
    const getColSpanClasses = () => {
      if (!colSpan) return '';
      
      if (typeof colSpan === 'number') {
        return `col-span-${colSpan}`;
      }

      const classes: string[] = [];
      
      if (colSpan.default) classes.push(`col-span-${colSpan.default}`);
      if (colSpan.sm) classes.push(`sm:col-span-${colSpan.sm}`);
      if (colSpan.md) classes.push(`md:col-span-${colSpan.md}`);
      if (colSpan.lg) classes.push(`lg:col-span-${colSpan.lg}`);
      if (colSpan.xl) classes.push(`xl:col-span-${colSpan.xl}`);
      if (colSpan['2xl']) classes.push(`2xl:col-span-${colSpan['2xl']}`);

      return classes.join(' ');
    };

    // Generate row span classes
    const getRowSpanClasses = () => {
      if (!rowSpan) return '';
      
      if (typeof rowSpan === 'number') {
        return `row-span-${rowSpan}`;
      }

      const classes: string[] = [];
      
      if (rowSpan.default) classes.push(`row-span-${rowSpan.default}`);
      if (rowSpan.sm) classes.push(`sm:row-span-${rowSpan.sm}`);
      if (rowSpan.md) classes.push(`md:row-span-${rowSpan.md}`);
      if (rowSpan.lg) classes.push(`lg:row-span-${rowSpan.lg}`);
      if (rowSpan.xl) classes.push(`xl:row-span-${rowSpan.xl}`);
      if (rowSpan['2xl']) classes.push(`2xl:row-span-${rowSpan['2xl']}`);

      return classes.join(' ');
    };

    return (
      <div
        ref={ref}
        className={cn(
          getColSpanClasses(),
          getRowSpanClasses(),
          colStart && `col-start-${colStart}`,
          rowStart && `row-start-${rowStart}`,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GridItem.displayName = 'GridItem';

export { Grid, GridItem };