import React, { useState, useRef, useEffect, cloneElement } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils';

export interface TooltipProps {
  /**
   * Content to display in the tooltip
   */
  content: React.ReactNode;
  /**
   * Element that triggers the tooltip
   */
  children: React.ReactElement;
  /**
   * Placement of the tooltip relative to the trigger
   */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /**
   * Delay before showing tooltip (ms)
   */
  delay?: number;
  /**
   * Whether the tooltip is disabled
   */
  disabled?: boolean;
  /**
   * Additional CSS classes for the tooltip
   */
  className?: string;
  /**
   * Offset from the trigger element (px)
   */
  offset?: number;
  /**
   * Whether to show arrow
   */
  showArrow?: boolean;
  /**
   * Maximum width of the tooltip
   */
  maxWidth?: number;
  /**
   * Trigger mode
   */
  trigger?: 'hover' | 'click' | 'focus';
  /**
   * Whether tooltip is controlled externally
   */
  isOpen?: boolean;
  /**
   * Callback when tooltip visibility changes
   */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Calculate tooltip position based on trigger element and placement
 */
const calculatePosition = (
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: string,
  offset: number
): { top: number; left: number; actualPlacement: string } => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  let top = 0;
  let left = 0;
  let actualPlacement = placement;

  // Auto placement - find best position
  if (placement === 'auto') {
    const spaces = {
      top: triggerRect.top - scrollY,
      bottom: viewportHeight - (triggerRect.bottom - scrollY),
      left: triggerRect.left - scrollX,
      right: viewportWidth - (triggerRect.right - scrollX),
    };

    // Choose placement with most space
    actualPlacement = Object.entries(spaces).reduce((a, b) => 
      b[1] > spaces[a as keyof typeof spaces] ? b[0] : a
    , 'top');
  }

  // Calculate position based on placement
  switch (actualPlacement) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - offset + scrollY;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2 + scrollX;
      break;
    case 'bottom':
      top = triggerRect.bottom + offset + scrollY;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2 + scrollX;
      break;
    case 'left':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2 + scrollY;
      left = triggerRect.left - tooltipRect.width - offset + scrollX;
      break;
    case 'right':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2 + scrollY;
      left = triggerRect.right + offset + scrollX;
      break;
  }

  // Ensure tooltip stays within viewport
  const padding = 8;
  
  if (left < padding + scrollX) {
    left = padding + scrollX;
  } else if (left + tooltipRect.width > viewportWidth - padding + scrollX) {
    left = viewportWidth - tooltipRect.width - padding + scrollX;
  }

  if (top < padding + scrollY) {
    top = padding + scrollY;
  } else if (top + tooltipRect.height > viewportHeight - padding + scrollY) {
    top = viewportHeight - tooltipRect.height - padding + scrollY;
  }

  return { top, left, actualPlacement };
};

/**
 * Enhanced Tooltip component with smart positioning
 * 
 * @example
 * ```tsx
 * // Basic tooltip
 * <Tooltip content="This is a tooltip">
 *   <button>Hover me</button>
 * </Tooltip>
 * 
 * // With custom placement
 * <Tooltip content="Left tooltip" placement="left">
 *   <button>Click me</button>
 * </Tooltip>
 * 
 * // Controlled tooltip
 * <Tooltip 
 *   content="Controlled tooltip" 
 *   isOpen={isOpen}
 *   onOpenChange={setIsOpen}
 * >
 *   <button>Target</button>
 * </Tooltip>
 * ```
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'auto',
  delay = 200,
  disabled = false,
  className,
  offset = 8,
  showArrow = true,
  maxWidth = 250,
  trigger = 'hover',
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);
  
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (open: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(open);
    }
    onOpenChange?.(open);
  };

  // Update position when tooltip opens or window resizes
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const tooltipRect = tooltipRef.current!.getBoundingClientRect();
      const result = calculatePosition(triggerRect, tooltipRect, placement, offset);
      
      setPosition({ top: result.top, left: result.left });
      setActualPlacement(result.actualPlacement);
    };

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, placement, offset]);

  // Handle trigger events
  const handleMouseEnter = () => {
    if (trigger !== 'hover' || disabled) return;
    
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (trigger !== 'hover') return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  };

  const handleClick = () => {
    if (trigger !== 'click' || disabled) return;
    setIsOpen(!isOpen);
  };

  const handleFocus = () => {
    if (trigger !== 'focus' || disabled) return;
    setIsOpen(true);
  };

  const handleBlur = () => {
    if (trigger !== 'focus') return;
    setIsOpen(false);
  };

  // Close on outside click for click trigger
  useEffect(() => {
    if (trigger === 'click' && isOpen) {
      const handleOutsideClick = (e: MouseEvent) => {
        if (
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node) &&
          tooltipRef.current &&
          !tooltipRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('click', handleOutsideClick);
      return () => document.removeEventListener('click', handleOutsideClick);
    }
  }, [trigger, isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Clone child element and attach ref and events
  const triggerElement = cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick,
    onFocus: handleFocus,
    onBlur: handleBlur,
    'aria-describedby': isOpen ? 'tooltip' : undefined,
  });

  const arrowClasses = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700 border-l-transparent border-r-transparent border-t-transparent',
    left: 'right-[-4px] top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700 border-t-transparent border-b-transparent border-r-transparent',
    right: 'left-[-4px] top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700 border-t-transparent border-b-transparent border-l-transparent',
  };

  const tooltipContent = isOpen && !disabled && content && (
    <div
      ref={tooltipRef}
      id="tooltip"
      role="tooltip"
      className={cn(
        'fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxWidth: `${maxWidth}px`,
      }}
    >
      {content}
      {showArrow && (
        <div
          className={cn(
            'absolute w-0 h-0 border-4',
            arrowClasses[actualPlacement as keyof typeof arrowClasses]
          )}
        />
      )}
    </div>
  );

  return (
    <>
      {triggerElement}
      {typeof document !== 'undefined' && createPortal(tooltipContent, document.body)}
    </>
  );
};

Tooltip.displayName = 'Tooltip';

/**
 * Tooltip provider for managing multiple tooltips
 */
export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

TooltipProvider.displayName = 'TooltipProvider';