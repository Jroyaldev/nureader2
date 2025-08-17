"use client";

import React from 'react';
import { GlassContainer } from '../Glass/GlassContainer';
import { cn } from '@/utils/theme';

interface PanelProps {
  variant: 'floating' | 'sidebar' | 'modal' | 'toolbar' | 'bottomSheet';
  position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  isOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Panel Component - Base panel container for all reader UI
 * Standardizes positioning, sizing, and transitions
 * Replaces custom implementations in SearchPanel, SettingsPanel, etc.
 */
export const Panel = ({
  variant,
  position = 'right',
  size = 'md',
  isOpen = true,
  children,
  className
}: PanelProps) => {
  
  const variantClasses = {
    floating: 'fixed z-50 transition-all duration-300',
    sidebar: 'fixed top-0 h-full z-40 transition-all duration-300',
    modal: 'fixed inset-0 z-50 flex items-center justify-center',
    toolbar: 'fixed z-30 transition-all duration-300',
    bottomSheet: 'fixed bottom-0 left-0 right-0 z-50 transition-all duration-500'
  };
  
  const getPositionClasses = () => {
    switch (variant) {
      case 'sidebar':
        return {
          left: 'left-0',
          right: 'right-0',
          top: 'top-0 left-0 right-0',
          bottom: 'bottom-0 left-0 right-0',
          center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
        }[position];
        
      case 'floating':
        return {
          left: 'left-6 top-1/2 -translate-y-1/2',
          right: 'right-6 top-1/2 -translate-y-1/2',
          top: 'top-6 left-1/2 -translate-x-1/2',
          bottom: 'bottom-6 left-1/2 -translate-x-1/2',
          center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
        }[position];
        
      case 'toolbar':
        return {
          top: 'top-0 left-0 right-0',
          bottom: 'bottom-0 left-0 right-0',
          left: 'left-0 top-0 bottom-0',
          right: 'right-0 top-0 bottom-0',
          center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
        }[position];
        
      case 'bottomSheet':
        return 'bottom-0 left-0 right-0';
        
      default:
        return '';
    }
  };
  
  const getSizeClasses = () => {
    if (variant === 'sidebar') {
      return {
        sm: 'w-80',
        md: 'w-96',
        lg: 'w-[480px]',
        xl: 'w-[600px]',
        full: 'w-full'
      }[size];
    }
    
    if (variant === 'floating') {
      return {
        sm: 'w-80 max-h-96',
        md: 'w-96 max-h-[500px]',
        lg: 'w-[480px] max-h-[600px]',
        xl: 'w-[600px] max-h-[700px]',
        full: 'w-full h-full'
      }[size];
    }
    
    if (variant === 'bottomSheet') {
      return {
        sm: 'max-h-[40vh]',
        md: 'max-h-[60vh]',
        lg: 'max-h-[80vh]',
        xl: 'max-h-[90vh]',
        full: 'h-full'
      }[size];
    }
    
    if (variant === 'toolbar') {
      return 'w-full';
    }
    
    return '';
  };
  
  const getTransitionClasses = () => {
    if (!isOpen) {
      if (variant === 'sidebar') {
        return position === 'right' ? 'translate-x-full' : 
               position === 'left' ? '-translate-x-full' : 
               position === 'top' ? '-translate-y-full' : 
               'translate-y-full';
      }
      
      if (variant === 'floating') {
        return 'opacity-0 scale-95 pointer-events-none';
      }
      
      if (variant === 'bottomSheet') {
        return 'translate-y-full';
      }
      
      if (variant === 'toolbar') {
        return position === 'top' ? '-translate-y-full' : 'translate-y-full';
      }
    }
    
    return 'translate-x-0 translate-y-0 opacity-100 scale-100';
  };
  
  return (
    <div className={cn(
      variantClasses[variant],
      getPositionClasses(),
      getSizeClasses(),
      getTransitionClasses(),
      className
    )}>
      <GlassContainer
        opacity={variant === 'bottomSheet' ? 'solid' : 'high'}
        shadow="xl"
        rounded={variant === 'bottomSheet' ? 'none' : '2xl'}
        className={cn(
          'h-full flex flex-col',
          variant === 'bottomSheet' && 'rounded-t-2xl'
        )}
      >
        {children}
      </GlassContainer>
    </div>
  );
};

Panel.displayName = 'Panel';