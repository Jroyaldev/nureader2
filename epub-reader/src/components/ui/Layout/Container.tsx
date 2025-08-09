/**
 * Container Component
 * 
 * Responsive container with consistent padding and max-widths.
 * Provides centered content with appropriate margins for different screen sizes.
 * Mobile-first responsive design with fluid typography and spacing.
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ===== CONTAINER COMPONENT =====

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Container size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Padding size with responsive variants */
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  /** Center the container */
  center?: boolean;
  /** Remove max-width constraints */
  fluid?: boolean;
  /** Custom breakpoint overrides */
  breakpoints?: {
    sm?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    md?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    lg?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    xl?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    '2xl'?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  };
  children: React.ReactNode;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ 
    className, 
    size = 'xl', 
    padding = 'responsive', 
    center = true, 
    fluid = false,
    breakpoints,
    children, 
    ...props 
  }, ref) => {
    // Generate max-width classes with responsive support
    const getMaxWidthClasses = () => {
      if (fluid) return 'w-full';
      
      const sizeMap = {
        xs: 'max-w-xs',          // 320px
        sm: 'max-w-screen-sm',   // 640px
        md: 'max-w-screen-md',   // 768px
        lg: 'max-w-screen-lg',   // 1024px
        xl: 'max-w-screen-xl',   // 1280px
        '2xl': 'max-w-screen-2xl', // 1536px
        full: 'max-w-full',
      };
      
      const classes = [sizeMap[size]];
      
      // Add responsive breakpoint overrides
      if (breakpoints) {
        if (breakpoints.sm) classes.push(`sm:${sizeMap[breakpoints.sm]}`);
        if (breakpoints.md) classes.push(`md:${sizeMap[breakpoints.md]}`);
        if (breakpoints.lg) classes.push(`lg:${sizeMap[breakpoints.lg]}`);
        if (breakpoints.xl) classes.push(`xl:${sizeMap[breakpoints.xl]}`);
        if (breakpoints['2xl']) classes.push(`2xl:${sizeMap[breakpoints['2xl']]}`);
      }
      
      return classes.join(' ');
    };

    // Generate padding classes with mobile-first responsive design
    const getPaddingClasses = () => {
      const paddingMap = {
        none: '',
        xs: 'px-2',
        sm: 'px-4',
        md: 'px-6',
        lg: 'px-8',
        xl: 'px-12',
        responsive: 'px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16',
      };
      return paddingMap[padding];
    };

    return (
      <div
        ref={ref}
        className={cn(
          'w-full',
          getMaxWidthClasses(),
          center && 'mx-auto',
          getPaddingClasses(),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';

// ===== SECTION COMPONENT =====

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Section padding */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Background variant */
  variant?: 'default' | 'muted' | 'accent';
  /** Full viewport height */
  fullHeight?: boolean;
  children: React.ReactNode;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ 
    className, 
    padding = 'lg', 
    variant = 'default', 
    fullHeight = false, 
    children, 
    ...props 
  }, ref) => {
    // Generate padding classes
    const getPaddingClass = () => {
      const paddingMap = {
        none: '',
        sm: 'py-8 sm:py-12',
        md: 'py-12 sm:py-16',
        lg: 'py-16 sm:py-20 lg:py-24',
        xl: 'py-20 sm:py-24 lg:py-32',
      };
      return paddingMap[padding];
    };

    // Generate background classes
    const getBackgroundClass = () => {
      const backgroundMap = {
        default: '',
        muted: 'bg-muted/30',
        accent: 'bg-accent/50',
      };
      return backgroundMap[variant];
    };

    return (
      <section
        ref={ref}
        className={cn(
          getPaddingClass(),
          getBackgroundClass(),
          fullHeight && 'min-h-screen',
          className
        )}
        {...props}
      >
        {children}
      </section>
    );
  }
);

Section.displayName = 'Section';

// ===== STACK COMPONENT =====

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stack direction */
  direction?: 'vertical' | 'horizontal';
  /** Gap between items */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Alignment of items */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Justification of items */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** Wrap items */
  wrap?: boolean;
  children: React.ReactNode;
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ 
    className, 
    direction = 'vertical', 
    gap = 'md', 
    align = 'stretch', 
    justify = 'start', 
    wrap = false, 
    children, 
    ...props 
  }, ref) => {
    // Generate direction classes
    const getDirectionClass = () => {
      return direction === 'vertical' ? 'flex-col' : 'flex-row';
    };

    // Generate gap classes
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
      return gapMap[gap];
    };

    // Generate alignment classes
    const getAlignClass = () => {
      const alignMap = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
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

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          getDirectionClass(),
          getGapClass(),
          getAlignClass(),
          getJustifyClass(),
          wrap && 'flex-wrap',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Stack.displayName = 'Stack';

export { Container, Section, Stack };