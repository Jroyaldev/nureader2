/**
 * Flexbox Layout Components
 * 
 * Comprehensive flexbox utilities for complex layouts with responsive support.
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ===== FLEX COMPONENT =====

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Flex direction */
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  /** Responsive flex direction */
  responsiveDirection?: {
    default?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
    sm?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
    md?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
    lg?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
    xl?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  };
  /** Flex wrap */
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  /** Gap between items */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Responsive gap */
  responsiveGap?: {
    default?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    sm?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    md?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    lg?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    xl?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  };
  /** Align items */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  /** Justify content */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** Align content (for wrapped items) */
  alignContent?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' | 'stretch';
  children: React.ReactNode;
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ 
    className, 
    direction = 'row', 
    responsiveDirection,
    wrap = 'nowrap', 
    gap = 'md', 
    responsiveGap,
    align = 'stretch', 
    justify = 'start', 
    alignContent,
    children, 
    ...props 
  }, ref) => {
    // Generate direction classes
    const getDirectionClasses = () => {
      const classes: string[] = [];
      
      if (responsiveDirection) {
        if (responsiveDirection.default) {
          const dirMap = {
            'row': 'flex-row',
            'col': 'flex-col',
            'row-reverse': 'flex-row-reverse',
            'col-reverse': 'flex-col-reverse',
          };
          classes.push(dirMap[responsiveDirection.default]);
        }
        if (responsiveDirection.sm) {
          const dirMap = {
            'row': 'sm:flex-row',
            'col': 'sm:flex-col',
            'row-reverse': 'sm:flex-row-reverse',
            'col-reverse': 'sm:flex-col-reverse',
          };
          classes.push(dirMap[responsiveDirection.sm]);
        }
        if (responsiveDirection.md) {
          const dirMap = {
            'row': 'md:flex-row',
            'col': 'md:flex-col',
            'row-reverse': 'md:flex-row-reverse',
            'col-reverse': 'md:flex-col-reverse',
          };
          classes.push(dirMap[responsiveDirection.md]);
        }
        if (responsiveDirection.lg) {
          const dirMap = {
            'row': 'lg:flex-row',
            'col': 'lg:flex-col',
            'row-reverse': 'lg:flex-row-reverse',
            'col-reverse': 'lg:flex-col-reverse',
          };
          classes.push(dirMap[responsiveDirection.lg]);
        }
        if (responsiveDirection.xl) {
          const dirMap = {
            'row': 'xl:flex-row',
            'col': 'xl:flex-col',
            'row-reverse': 'xl:flex-row-reverse',
            'col-reverse': 'xl:flex-col-reverse',
          };
          classes.push(dirMap[responsiveDirection.xl]);
        }
      } else {
        const dirMap = {
          'row': 'flex-row',
          'col': 'flex-col',
          'row-reverse': 'flex-row-reverse',
          'col-reverse': 'flex-col-reverse',
        };
        classes.push(dirMap[direction]);
      }
      
      return classes.join(' ');
    };

    // Generate wrap classes
    const getWrapClass = () => {
      const wrapMap = {
        'nowrap': 'flex-nowrap',
        'wrap': 'flex-wrap',
        'wrap-reverse': 'flex-wrap-reverse',
      };
      return wrapMap[wrap];
    };

    // Generate gap classes
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

      const classes: string[] = [];
      
      if (responsiveGap) {
        if (responsiveGap.default) classes.push(gapMap[responsiveGap.default]);
        if (responsiveGap.sm) classes.push(`sm:${gapMap[responsiveGap.sm]}`);
        if (responsiveGap.md) classes.push(`md:${gapMap[responsiveGap.md]}`);
        if (responsiveGap.lg) classes.push(`lg:${gapMap[responsiveGap.lg]}`);
        if (responsiveGap.xl) classes.push(`xl:${gapMap[responsiveGap.xl]}`);
      } else {
        classes.push(gapMap[gap]);
      }
      
      return classes.join(' ');
    };

    // Generate alignment classes
    const getAlignClass = () => {
      const alignMap = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
        baseline: 'items-baseline',
      };
      return alignMap[align];
    };

    // Generate justification classes
    const getJustifyClass = () => {
      const justifyMap = {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      };
      return justifyMap[justify];
    };

    // Generate align content classes
    const getAlignContentClass = () => {
      if (!alignContent) return '';
      
      const alignContentMap = {
        start: 'content-start',
        center: 'content-center',
        end: 'content-end',
        between: 'content-between',
        around: 'content-around',
        evenly: 'content-evenly',
        stretch: 'content-stretch',
      };
      return alignContentMap[alignContent];
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          getDirectionClasses(),
          getWrapClass(),
          getGapClasses(),
          getAlignClass(),
          getJustifyClass(),
          getAlignContentClass(),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Flex.displayName = 'Flex';

// ===== FLEX ITEM COMPONENT =====

export interface FlexItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Flex grow */
  grow?: boolean | number;
  /** Flex shrink */
  shrink?: boolean | number;
  /** Flex basis */
  basis?: 'auto' | 'full' | '1/2' | '1/3' | '2/3' | '1/4' | '3/4' | '1/5' | '2/5' | '3/5' | '4/5';
  /** Align self */
  alignSelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  /** Order */
  order?: number;
  children: React.ReactNode;
}

const FlexItem = React.forwardRef<HTMLDivElement, FlexItemProps>(
  ({ 
    className, 
    grow, 
    shrink, 
    basis, 
    alignSelf, 
    order, 
    children, 
    ...props 
  }, ref) => {
    // Generate flex grow classes
    const getGrowClass = () => {
      if (grow === true) return 'flex-grow';
      if (grow === false) return 'flex-grow-0';
      if (typeof grow === 'number') return `flex-grow-${grow}`;
      return '';
    };

    // Generate flex shrink classes
    const getShrinkClass = () => {
      if (shrink === true) return 'flex-shrink';
      if (shrink === false) return 'flex-shrink-0';
      if (typeof shrink === 'number') return `flex-shrink-${shrink}`;
      return '';
    };

    // Generate flex basis classes
    const getBasisClass = () => {
      if (!basis) return '';
      
      const basisMap = {
        auto: 'basis-auto',
        full: 'basis-full',
        '1/2': 'basis-1/2',
        '1/3': 'basis-1/3',
        '2/3': 'basis-2/3',
        '1/4': 'basis-1/4',
        '3/4': 'basis-3/4',
        '1/5': 'basis-1/5',
        '2/5': 'basis-2/5',
        '3/5': 'basis-3/5',
        '4/5': 'basis-4/5',
      };
      return basisMap[basis];
    };

    // Generate align self classes
    const getAlignSelfClass = () => {
      if (!alignSelf) return '';
      
      const alignSelfMap = {
        auto: 'self-auto',
        start: 'self-start',
        center: 'self-center',
        end: 'self-end',
        stretch: 'self-stretch',
        baseline: 'self-baseline',
      };
      return alignSelfMap[alignSelf];
    };

    // Generate order classes
    const getOrderClass = () => {
      if (order === undefined) return '';
      return `order-${order}`;
    };

    return (
      <div
        ref={ref}
        className={cn(
          getGrowClass(),
          getShrinkClass(),
          getBasisClass(),
          getAlignSelfClass(),
          getOrderClass(),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FlexItem.displayName = 'FlexItem';

export { Flex, FlexItem };