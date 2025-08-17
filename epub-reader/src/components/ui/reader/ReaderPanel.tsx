"use client";

import React from 'react';
import { Panel } from '../core/Panel/Panel';
import { PanelHeader } from '../core/Panel/PanelHeader';
import { PanelContent } from '../core/Panel/PanelContent';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface ReaderPanelProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * ReaderPanel Component - Standardized reader UI panel
 * Automatically adapts between desktop floating and mobile bottom sheet
 * Based on successful TableOfContents implementation
 * Replaces custom implementations in SearchPanel, SettingsPanel, etc.
 */
export const ReaderPanel = ({
  title,
  subtitle,
  icon,
  isOpen,
  onClose,
  children,
  position = 'right',
  size = 'md',
  className
}: ReaderPanelProps) => {
  
  const { isMobile } = useBreakpoint();
  
  // Mobile: Use bottom sheet pattern
  // Desktop: Use floating sidebar pattern
  const variant = isMobile ? 'bottomSheet' : 'floating';
  const panelPosition = isMobile ? 'bottom' : position;
  
  return (
    <Panel
      variant={variant}
      position={panelPosition}
      size={size}
      isOpen={isOpen}
      className={className}
    >
      <PanelHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        onClose={onClose}
        mobile={isMobile}
      />
      
      <PanelContent
        mobile={isMobile}
        scrollable={true}
        padding="md"
      >
        {children}
      </PanelContent>
    </Panel>
  );
};

ReaderPanel.displayName = 'ReaderPanel';