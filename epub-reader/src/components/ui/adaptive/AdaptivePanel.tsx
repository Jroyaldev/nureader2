"use client";

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Panel, PanelContent, PanelHeader } from '@/components/ui/core/Panel';

interface AdaptivePanelProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * AdaptivePanel - A responsive panel component that adapts based on screen size
 * 
 * Behavior:
 * - Mobile (< 768px): Always renders as bottom sheet regardless of position prop
 * - Tablet (768px - 1024px): Side panels with overlay
 * - Desktop (> 1024px): Floating panels or sidebars
 * 
 * Features:
 * - Gesture support for mobile bottom sheets
 * - Smooth animations between breakpoints
 * - Accessibility with proper focus management
 * - Safe area support for mobile devices
 */
const AdaptivePanel = ({ 
  children, 
  title, 
  icon: Icon, 
  isOpen, 
  onClose, 
  position = 'right', 
  size = 'md',
  className 
}: AdaptivePanelProps) => {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusableElement = panelRef.current.querySelector(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (focusableElement) {
        setTimeout(() => focusableElement.focus(), 100);
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Determine adaptive behavior
  const adaptivePosition = isMobile ? 'bottom' : position;
  const adaptiveVariant = isMobile ? 'bottomSheet' : isTablet ? 'sidebar' : 'floating';

  // Size configurations
  const sizeConfig = {
    sm: {
      mobile: 'h-1/3',
      tablet: 'w-80',
      desktop: 'w-80'
    },
    md: {
      mobile: 'h-1/2',
      tablet: 'w-96',
      desktop: 'w-96'
    },
    lg: {
      mobile: 'h-2/3',
      tablet: 'w-[28rem]',
      desktop: 'w-[32rem]'
    }
  };

  const currentSize = isMobile 
    ? sizeConfig[size].mobile 
    : isTablet 
      ? sizeConfig[size].tablet 
      : sizeConfig[size].desktop;

  // Animation classes based on position and device type
  const getAnimationClasses = () => {
    const base = 'transition-all duration-300 ease-out';
    
    if (isMobile) {
      return cn(
        base,
        'fixed inset-x-0 bottom-0 z-50',
        currentSize,
        isOpen ? 'translate-y-0' : 'translate-y-full'
      );
    }
    
    if (isTablet) {
      const positionClasses = {
        left: cn(
          'fixed left-0 top-0 h-full z-40',
          currentSize,
          isOpen ? 'translate-x-0' : '-translate-x-full'
        ),
        right: cn(
          'fixed right-0 top-0 h-full z-40',
          currentSize,
          isOpen ? 'translate-x-0' : 'translate-x-full'
        ),
        bottom: cn(
          'fixed inset-x-0 bottom-0 z-40',
          currentSize,
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )
      };
      
      return cn(base, positionClasses[adaptivePosition]);
    }
    
    // Desktop floating panels
    const desktopClasses = {
      left: cn(
        'fixed left-4 top-4 bottom-4 z-30',
        currentSize,
        isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      ),
      right: cn(
        'fixed right-4 top-4 bottom-4 z-30',
        currentSize,
        isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      ),
      bottom: cn(
        'fixed left-4 right-4 bottom-4 max-h-96 z-30',
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      )
    };
    
    return cn(base, desktopClasses[adaptivePosition]);
  };

  // Panel content styling based on device type
  const getPanelContentClasses = () => {
    const base = 'surface-glass-high shadow-2xl flex flex-col h-full font-inter';
    
    if (isMobile) {
      return cn(
        base,
        'rounded-t-3xl',
        'safe-area-pb' // Safe area padding bottom
      );
    }
    
    if (isTablet) {
      const roundingClasses = {
        left: 'rounded-r-2xl',
        right: 'rounded-l-2xl', 
        bottom: 'rounded-t-2xl'
      };
      
      return cn(base, roundingClasses[adaptivePosition]);
    }
    
    // Desktop
    return cn(base, 'rounded-2xl');
  };

  // Backdrop/overlay
  const renderBackdrop = () => {
    if (!isOpen || isDesktop) return null;
    
    return (
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
    );
  };

  // Mobile bottom sheet handle
  const renderMobileHandle = () => {
    if (!isMobile) return null;
    
    return (
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-12 h-1 bg-text-tertiary rounded-full opacity-60" />
      </div>
    );
  };

  if (!isOpen && adaptiveVariant !== 'floating') {
    return null;
  }

  return (
    <>
      {renderBackdrop()}
      
      <div 
        ref={panelRef}
        className={cn(getAnimationClasses(), className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
      >
        <div className={getPanelContentClasses()}>
          {renderMobileHandle()}
          
          <PanelHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <h2 
                id="panel-title"
                className="text-xl font-semibold flex items-center gap-2 text-foreground"
              >
                {Icon && <Icon className="w-5 h-5" />}
                {title}
              </h2>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/10 dark:hover:bg-white/20 active:bg-black/20 dark:active:bg-white/30 rounded-lg transition-colors touch-manipulation backdrop-blur-sm"
                aria-label="Close panel"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </PanelHeader>
          
          <PanelContent className="flex-1 overflow-y-auto">
            {children}
          </PanelContent>
        </div>
      </div>
    </>
  );
};

export default AdaptivePanel;
export type { AdaptivePanelProps };