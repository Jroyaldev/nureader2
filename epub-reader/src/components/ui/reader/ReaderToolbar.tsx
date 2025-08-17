"use client";

import React from 'react';
import { GlassContainer } from '../core/Glass/GlassContainer';
import { cn } from '@/utils/theme';

interface ReaderToolbarProps {
  position: 'top' | 'bottom';
  size?: 'compact' | 'normal' | 'full';
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

/**
 * ReaderToolbar Component - Standardized toolbar for reader UI
 * Based on successful MobileToolbar glass implementation
 * Provides consistent positioning and styling
 */
export const ReaderToolbar = ({
  position,
  size = 'normal',
  children,
  className,
  visible = true
}: ReaderToolbarProps) => {
  
  const positionClasses = {
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0'
  };
  
  const sizeClasses = {
    compact: 'py-2',
    normal: 'py-3',
    full: 'py-4'
  };
  
  return (
    <div className={cn(
      'fixed z-50 transition-all duration-300',
      positionClasses[position],
      visible ? 'translate-y-0 opacity-100' : 
        position === 'top' ? '-translate-y-full opacity-0' : 
        'translate-y-full opacity-0',
      // Safe area support
      position === 'top' && 'safe-area-pt',
      position === 'bottom' && 'safe-area-pb'
    )}>
      <GlassContainer
        opacity="medium"
        blur="xl"
        border={position === 'top'}
        className={cn(
          'w-full',
          sizeClasses[size],
          // Border positioning
          position === 'top' && 'border-b border-t-0 border-l-0 border-r-0',
          position === 'bottom' && 'border-t border-b-0 border-l-0 border-r-0',
          'reader-mobile-toolbar',
          className
        )}
      >
        {children}
      </GlassContainer>
    </div>
  );
};

ReaderToolbar.displayName = 'ReaderToolbar';