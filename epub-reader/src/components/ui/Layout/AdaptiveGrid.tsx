"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface AdaptiveGridProps {
  children: React.ReactNode;
  minItemWidth?: number; // Minimum width for grid items in pixels
  maxItemWidth?: number; // Maximum width for grid items in pixels
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
  autoFill?: boolean; // Use auto-fill vs auto-fit
  className?: string;
}

/**
 * AdaptiveGrid - Responsive grid that adapts to container width and content
 * 
 * Features:
 * - Automatically calculates optimal number of columns
 * - Respects minimum and maximum item widths
 * - Responsive gap sizing
 * - Supports both auto-fill and auto-fit behaviors
 * - Works seamlessly across all device sizes
 */
const AdaptiveGrid = ({ 
  children,
  minItemWidth = 200,
  maxItemWidth = 400,
  gap = 'md',
  responsive = true,
  autoFill = false,
  className
}: AdaptiveGridProps) => {
  const { width, isMobile, isTablet } = useBreakpoint();
  
  // Gap size configurations
  const gapClasses = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  // Responsive gap adjustments
  const getResponsiveGap = () => {
    if (isMobile) {
      // Smaller gaps on mobile
      const mobileGaps = {
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-3',
        lg: 'gap-4',
        xl: 'gap-5'
      };
      return mobileGaps[gap];
    }
    
    return gapClasses[gap];
  };

  // Calculate grid template columns
  const getGridTemplateColumns = () => {
    if (!responsive) {
      return `repeat(auto-${autoFill ? 'fill' : 'fit'}, minmax(${minItemWidth}px, 1fr))`;
    }

    // Device-specific optimizations
    if (isMobile) {
      // On mobile, prefer fewer columns with larger items
      const mobileMinWidth = Math.max(minItemWidth, width * 0.4); // At least 40% of screen width
      return `repeat(auto-${autoFill ? 'fill' : 'fit'}, minmax(${mobileMinWidth}px, 1fr))`;
    }

    if (isTablet) {
      // On tablet, balance between mobile and desktop
      const tabletMinWidth = Math.max(minItemWidth, width * 0.25); // At least 25% of screen width
      return `repeat(auto-${autoFill ? 'fill' : 'fit'}, minmax(${tabletMinWidth}px, ${maxItemWidth}px))`;
    }

    // Desktop: Use full range
    return `repeat(auto-${autoFill ? 'fill' : 'fit'}, minmax(${minItemWidth}px, ${maxItemWidth}px))`;
  };

  return (
    <div 
      className={cn(
        'grid w-full',
        getResponsiveGap(),
        className
      )}
      style={{
        gridTemplateColumns: getGridTemplateColumns()
      }}
    >
      {children}
    </div>
  );
};

export default AdaptiveGrid;
export type { AdaptiveGridProps };