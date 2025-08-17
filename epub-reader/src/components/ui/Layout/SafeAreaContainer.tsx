"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface SafeAreaContainerProps {
  children: React.ReactNode;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * SafeAreaContainer - Handles safe area insets for modern mobile devices
 * 
 * Features:
 * - Respects device safe areas (notches, home indicators, etc.)
 * - Configurable for specific edges
 * - Uses CSS env() variables for safe area insets
 * - Fallback support for older devices
 * - Works with iOS and Android devices
 */
const SafeAreaContainer = ({ 
  children,
  edges = ['top', 'bottom'],
  className,
  as: Component = 'div'
}: SafeAreaContainerProps) => {
  const { isMobile } = useBreakpoint();
  
  // Generate safe area classes based on edges
  const getSafeAreaClasses = () => {
    if (!isMobile) return '';
    
    const classes: string[] = [];
    
    edges.forEach(edge => {
      switch (edge) {
        case 'top':
          classes.push('safe-area-pt');
          break;
        case 'bottom':
          classes.push('safe-area-pb');
          break;
        case 'left':
          classes.push('safe-area-pl');
          break;
        case 'right':
          classes.push('safe-area-pr');
          break;
      }
    });
    
    return classes.join(' ');
  };

  return (
    <Component 
      className={cn(
        'relative',
        getSafeAreaClasses(),
        className
      )}
    >
      {children}
    </Component>
  );
};

// Individual safe area components for specific use cases
export const SafeAreaTop = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('safe-area-pt', className)}>
    {children}
  </div>
);

export const SafeAreaBottom = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('safe-area-pb', className)}>
    {children}
  </div>
);

export const SafeAreaLeft = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('safe-area-pl', className)}>
    {children}
  </div>
);

export const SafeAreaRight = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('safe-area-pr', className)}>
    {children}
  </div>
);

// Hook for getting safe area values
export const useSafeArea = () => {
  const { isMobile } = useBreakpoint();
  
  // Get safe area insets from CSS environment variables
  const getSafeAreaInset = (edge: 'top' | 'bottom' | 'left' | 'right') => {
    if (!isMobile || typeof window === 'undefined') return 0;
    
    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue(`--safe-area-inset-${edge}`);
    
    if (value) {
      return parseInt(value.replace('px', ''), 10) || 0;
    }
    
    // Fallback: use env() if CSS custom properties aren't set
    try {
      const style = document.createElement('div');
      style.style.paddingTop = `env(safe-area-inset-${edge})`;
      document.body.appendChild(style);
      const computedValue = getComputedStyle(style).paddingTop;
      document.body.removeChild(style);
      return parseInt(computedValue.replace('px', ''), 10) || 0;
    } catch {
      return 0;
    }
  };
  
  return {
    top: getSafeAreaInset('top'),
    bottom: getSafeAreaInset('bottom'),
    left: getSafeAreaInset('left'),
    right: getSafeAreaInset('right'),
    isMobile
  };
};

export default SafeAreaContainer;
export type { SafeAreaContainerProps };