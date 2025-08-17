"use client";

import React from 'react';
import { cn } from '@/utils/theme';

interface PanelContentProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  scrollable?: boolean;
  mobile?: boolean;
  className?: string;
}

/**
 * PanelContent Component - Standardized panel content area
 * Handles scrolling, padding, and responsive behavior
 * Based on successful TableOfContents content patterns
 */
export const PanelContent = ({
  children,
  padding = 'md',
  scrollable = true,
  mobile = false,
  className
}: PanelContentProps) => {
  
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: mobile ? 'p-4' : 'px-4 py-4',
    lg: mobile ? 'p-6' : 'px-6 py-6'
  };
  
  return (
    <div className={cn(
      'flex-1',
      scrollable && 'overflow-y-auto',
      paddingClasses[padding],
      // Scrollbar styling
      scrollable && cn(
        'scrollbar-thin scrollbar-thumb-text-tertiary/30 scrollbar-track-transparent',
        'hover:scrollbar-thumb-text-tertiary/50'
      ),
      // Mobile touch scrolling
      mobile && scrollable && 'mobile-scroll',
      // Safe area for mobile
      mobile && 'safe-area-pb',
      className
    )}>
      {children}
    </div>
  );
};

PanelContent.displayName = 'PanelContent';