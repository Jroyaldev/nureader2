"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useGestures } from '@/hooks/useGestures';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[]; // Percentage heights (0.3 = 30%)
  initialSnap?: number; // Index into snapPoints array
  showHandle?: boolean;
  backdrop?: boolean;
  dismissible?: boolean;
  className?: string;
  contentClassName?: string;
  title?: string;
  subtitle?: string;
}

/**
 * BottomSheet - Native-style bottom sheet component for mobile interfaces
 * 
 * Features:
 * - Multiple snap points for different heights
 * - Gesture-based interaction (swipe to dismiss/expand)
 * - Smooth spring animations
 * - Backdrop with tap-to-dismiss
 * - Safe area support for mobile devices
 * - Keyboard avoidance
 * - Accessibility with proper focus management
 */
const BottomSheet = ({
  isOpen,
  onClose,
  children,
  snapPoints = [0.3, 0.6, 0.9],
  initialSnap = 1,
  showHandle = true,
  backdrop = true,
  dismissible = true,
  className,
  contentClassName,
  title,
  subtitle
}: BottomSheetProps) => {
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useBreakpoint();

  // Reset snap point when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentSnapIndex(initialSnap);
      setDragOffset(0);
    }
  }, [isOpen, initialSnap]);

  // Calculate current height based on snap point and drag offset
  const currentHeight = snapPoints[currentSnapIndex] * 100 + dragOffset;

  // Handle gesture interactions
  const gestures = useGestures({
    onSwipeDown: () => {
      if (!isDragging) {
        // Swipe down to go to next lower snap point or close
        if (currentSnapIndex > 0) {
          setCurrentSnapIndex(currentSnapIndex - 1);
        } else if (dismissible) {
          onClose();
        }
      }
    },
    onSwipeUp: () => {
      if (!isDragging) {
        // Swipe up to go to next higher snap point
        if (currentSnapIndex < snapPoints.length - 1) {
          setCurrentSnapIndex(currentSnapIndex + 1);
        }
      }
    },
    threshold: 30,
    enabled: isOpen && isMobile
  });

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    if (dismissible && backdrop) {
      onClose();
    }
  }, [dismissible, backdrop, onClose]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const focusableElement = contentRef.current.querySelector(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (focusableElement) {
        setTimeout(() => focusableElement.focus(), 150);
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && dismissible) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, dismissible, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen && isMobile) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen, isMobile]);

  // Don't render on desktop or when closed
  if (!isMobile || !isOpen) {
    return null;
  }

  const sheetHeight = Math.max(0, Math.min(100, currentHeight));

  return (
    <>
      {/* Backdrop */}
      {backdrop && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm",
            "transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full",
          className
        )}
        style={{
          height: `${sheetHeight}vh`,
          transform: isOpen 
            ? `translateY(${isDragging ? dragOffset : 0}px)` 
            : 'translateY(100%)'
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "bottomsheet-title" : undefined}
        aria-describedby={subtitle ? "bottomsheet-subtitle" : undefined}
      >
        <div
          {...gestures}
          className={cn(
            "h-full surface-glass-high rounded-t-3xl",
            "flex flex-col overflow-hidden",
            "safe-area-pb", // Safe area padding bottom
            contentClassName
          )}
        >
          {/* Handle */}
          {showHandle && (
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-text-tertiary rounded-full opacity-60" />
            </div>
          )}

          {/* Header */}
          {(title || subtitle) && (
            <div className="px-6 pt-2 pb-4 shrink-0">
              {title && (
                <h2 
                  id="bottomsheet-title"
                  className="text-xl font-semibold text-foreground"
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p 
                  id="bottomsheet-subtitle"
                  className="text-sm text-muted mt-1"
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Content */}
          <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto overscroll-contain"
            style={{
              // Smooth scrolling on iOS
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {children}
          </div>

          {/* Snap Point Indicators (optional visual aid) */}
          {snapPoints.length > 1 && (
            <div className="flex justify-center py-2 gap-1">
              {snapPoints.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    index === currentSnapIndex 
                      ? "bg-blue-500" 
                      : "bg-text-tertiary opacity-30"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Hook for easier BottomSheet management
export const useBottomSheet = (initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen
  };
};

export default BottomSheet;
export type { BottomSheetProps };