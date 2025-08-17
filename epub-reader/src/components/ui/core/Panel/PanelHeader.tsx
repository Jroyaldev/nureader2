"use client";

import React from 'react';
import { IconButton } from '../Button/IconButton';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/theme';

interface PanelHeaderProps {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClose?: () => void;
  mobile?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * PanelHeader Component - Consistent panel headers
 * Based on successful TableOfContents header pattern
 * Standardizes headers across SearchPanel, SettingsPanel, etc.
 */
export const PanelHeader = ({
  title,
  subtitle,
  icon: Icon,
  onClose,
  mobile = false,
  children,
  className
}: PanelHeaderProps) => {
  
  return (
    <div className={cn(
      'shrink-0 panel-header px-6 py-5',
      'border-b border-primary/8',
      'bg-gradient-to-b from-border-glass/10 to-transparent',
      className
    )}>
      {mobile && (
        // Mobile handle for bottom sheets
        <div className="flex justify-center pb-3">
          <div className="w-12 h-1.5 bg-text-tertiary/60 rounded-full" />
        </div>
      )}
      
      <div className="flex items-center justify-between">
        {/* Left side - Icon and title */}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-interactive-focus/20 to-interactive-focus/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-interactive-focus" />
            </div>
          )}
          
          {(title || subtitle) && (
            <div>
              {title && (
                <h3 className={cn(
                  'font-semibold text-primary font-inter',
                  mobile ? 'text-lg' : 'text-base'
                )}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={cn(
                  'text-secondary font-inter',
                  mobile ? 'text-sm' : 'text-xs'
                )}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Right side - Close button and custom content */}
        <div className="flex items-center gap-2">
          {children}
          {onClose && (
            <IconButton
              icon={<XMarkIcon className="w-4 h-4" />}
              onClick={onClose}
              variant="ghost"
              size={mobile ? 'touch' : 'md'}
              aria-label="Close panel"
              className={mobile ? 'bg-surface-secondary/50 hover:bg-surface-secondary/70' : ''}
            />
          )}
        </div>
      </div>
    </div>
  );
};

PanelHeader.displayName = 'PanelHeader';