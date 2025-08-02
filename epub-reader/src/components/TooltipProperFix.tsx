"use client";

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
}

export default function TooltipProperFix({ 
  content, 
  children, 
  delay = 700,
  position = 'bottom',
  disabled = false
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Position styles with transforms baked in
  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute' as const,
      zIndex: 10100,
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
        };
      case 'bottom':
        return {
          ...baseStyles,
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '8px',
        };
      case 'left':
        return {
          ...baseStyles,
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginRight: '8px',
        };
      case 'right':
        return {
          ...baseStyles,
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: '8px',
        };
      default:
        return {
          ...baseStyles,
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '8px',
        };
    }
  };

  const getArrowStyles = () => {
    const baseStyles = {
      position: 'absolute' as const,
      width: 0,
      height: 0,
      borderStyle: 'solid',
      borderWidth: '4px',
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderColor: 'rgb(17 24 39) transparent transparent transparent',
        };
      case 'bottom':
        return {
          ...baseStyles,
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderColor: 'transparent transparent rgb(17 24 39) transparent',
        };
      case 'left':
        return {
          ...baseStyles,
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          borderColor: 'transparent transparent transparent rgb(17 24 39)',
        };
      case 'right':
        return {
          ...baseStyles,
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          borderColor: 'transparent rgb(17 24 39) transparent transparent',
        };
      default:
        return {
          ...baseStyles,
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderColor: 'transparent transparent rgb(17 24 39) transparent',
        };
    }
  };

  if (isMobile || disabled) {
    return children;
  }

  return (
    <div className="relative inline-block">
      {React.cloneElement(children, {
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: showTooltip,
        onBlur: hideTooltip,
      })}
      
      {isVisible && (
        <div
          className="px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-50 dark:text-gray-900 rounded-md shadow-md border border-gray-200 dark:border-gray-800 whitespace-nowrap pointer-events-none"
          style={{
            ...getPositionStyles(),
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.2s ease-out',
          }}
        >
          {content}
          <div 
            style={getArrowStyles()}
            className="dark:[border-color:rgb(249_250_251)_transparent_transparent_transparent]"
          />
        </div>
      )}
    </div>
  );
}