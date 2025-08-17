"use client";

import React, { useEffect } from 'react';
import { GlassContainer } from './GlassContainer';
import { cn } from '@/utils/theme';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdrop?: 'light' | 'dark' | 'blur';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'top' | 'bottom';
  className?: string;
}

/**
 * GlassModal Component - Full-screen modal with glassmorphism
 * Standardizes modal patterns across SearchPanel, SettingsPanel, etc.
 * Uses semantic glass classes for consistent theming
 */
export const GlassModal = ({
  isOpen,
  onClose,
  children,
  backdrop = 'blur',
  size = 'md',
  position = 'center',
  className
}: GlassModalProps) => {
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const backdropClasses = {
    light: 'bg-black/20',
    dark: 'bg-black/60', 
    blur: 'bg-black/40 backdrop-blur-md'
  };
  
  const sizeClasses = {
    sm: 'w-80 max-h-96',
    md: 'w-96 max-h-[500px]',
    lg: 'w-[480px] max-h-[600px]',
    xl: 'w-[600px] max-h-[700px]',
    full: 'w-full h-full max-w-none max-h-none'
  };
  
  const positionClasses = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-16',
    bottom: 'items-end justify-center pb-16'
  };
  
  return (
    <div className={cn(
      'fixed inset-0 z-50 flex transition-all duration-300',
      positionClasses[position],
      isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
    )}>
      {/* Backdrop */}
      <div 
        className={cn(
          'absolute inset-0 transition-all duration-300',
          backdropClasses[backdrop]
        )}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <GlassContainer
        opacity="solid"
        shadow="xl"
        rounded="2xl"
        className={cn(
          'relative flex flex-col',
          sizeClasses[size],
          'transform transition-all duration-300',
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95',
          // Mobile responsiveness
          'mx-4 max-w-[calc(100vw-2rem)]',
          className
        )}
      >
        {children}
      </GlassContainer>
    </div>
  );
};

GlassModal.displayName = 'GlassModal';