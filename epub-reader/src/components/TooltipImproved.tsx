"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
}

export default function TooltipImproved({ 
  content, 
  children, 
  delay = 300,
  position = 'bottom',
  disabled = false
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const childRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const calculatePosition = useCallback(() => {
    if (!childRef.current || !tooltipRef.current) return;

    const childRect = childRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 8;
    
    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = childRect.top - tooltipRect.height - spacing;
        left = childRect.left + (childRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = childRect.bottom + spacing;
        left = childRect.left + (childRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = childRect.top + (childRect.height - tooltipRect.height) / 2;
        left = childRect.left - tooltipRect.width - spacing;
        break;
      case 'right':
        top = childRect.top + (childRect.height - tooltipRect.height) / 2;
        left = childRect.right + spacing;
        break;
    }

    // Ensure tooltip stays within viewport
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < padding) left = padding;
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }

    setTooltipPosition({ top, left });
  }, [position]);

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition);
      window.addEventListener('resize', calculatePosition);
      
      return () => {
        window.removeEventListener('scroll', calculatePosition);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [isVisible, calculatePosition]);

  const showTooltip = () => {
    if (disabled || isMobile) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (isMobile || disabled) {
    return children;
  }

  const tooltipContent = isVisible && (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
        zIndex: 99999,
      }}
      className="px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-50 dark:text-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-800 whitespace-nowrap pointer-events-none animate-tooltip-fade-in"
      role="tooltip"
    >
      {content}
    </div>
  );

  return (
    <>
      {React.cloneElement(children, {
        ref: (el: HTMLElement) => {
          childRef.current = el;
          const originalRef = (children as React.ReactElement & { ref?: React.Ref<HTMLElement> }).ref;
          if (originalRef) {
            if (typeof originalRef === 'function') {
              originalRef(el);
            } else {
              originalRef.current = el;
            }
          }
        },
        onMouseEnter: (e: React.MouseEvent) => {
          showTooltip();
          children.props.onMouseEnter?.(e);
        },
        onMouseLeave: (e: React.MouseEvent) => {
          hideTooltip();
          children.props.onMouseLeave?.(e);
        },
        onFocus: (e: React.FocusEvent) => {
          showTooltip();
          children.props.onFocus?.(e);
        },
        onBlur: (e: React.FocusEvent) => {
          hideTooltip();
          children.props.onBlur?.(e);
        },
        'aria-describedby': isVisible ? 'tooltip' : undefined,
      })}
      {typeof window !== 'undefined' && createPortal(tooltipContent, document.body)}
    </>
  );
}