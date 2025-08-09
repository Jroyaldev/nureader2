import React, { useState, useRef, useEffect, cloneElement } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

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
  trigger?: 'hover' | 'click' | 'focus' | 'manual';
  /**
   * Whether tooltip is controlled externally
   */
  isOpen?: boolean;
  /**
   * Callback when tooltip visibility changes
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Variant for different tooltip styles
   */
  variant?: 'default' | 'info' | 'warning' | 'error' | 'success';
  /**
   * Whether to enable mobile touch interactions
   */
  touchable?: boolean;
  /**
   * Side offset for fine-tuning position
   */
  sideOffset?: number;
  /**
   * Align offset for fine-tuning position
   */
  alignOffset?: number;
  /**
   * Whether to avoid collisions with viewport edges
   */
  avoidCollisions?: boolean;
  /**
   * Collision padding from viewport edges
   */
  collisionPadding?: number;
  /**
   * Whether tooltip should be sticky (remain open on hover)
   */
  sticky?: boolean;
}

/**
 * Detect if device supports touch
 */
const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Calculate tooltip position with smart collision detection
 */
const calculatePosition = (
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: string,
  offset: number,
  sideOffset: number = 0,
  alignOffset: number = 0,
  avoidCollisions: boolean = true,
  collisionPadding: number = 8
): { top: number; left: number; actualPlacement: string } => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  let top = 0;
  let left = 0;
  let actualPlacement = placement;

  // Auto placement - find best position with collision detection
  if (placement === 'auto') {
    const spaces = {
      top: triggerRect.top - scrollY - collisionPadding,
      bottom: viewportHeight - (triggerRect.bottom - scrollY) - collisionPadding,
      left: triggerRect.left - scrollX - collisionPadding,
      right: viewportWidth - (triggerRect.right - scrollX) - collisionPadding,
    };

    // Check if tooltip fits in each direction
    const fits = {
      top: spaces.top >= tooltipRect.height + offset,
      bottom: spaces.bottom >= tooltipRect.height + offset,
      left: spaces.left >= tooltipRect.width + offset,
      right: spaces.right >= tooltipRect.width + offset,
    };

    // Prefer directions that fit, otherwise choose the one with most space
    const validPlacements = Object.entries(fits)
      .filter(([_, canFit]) => canFit)
      .map(([dir]) => dir);

    if (validPlacements.length > 0) {
      actualPlacement = validPlacements.reduce((a, b) => 
        spaces[a as keyof typeof spaces] > spaces[b as keyof typeof spaces] ? a : b
      );
    } else {
      actualPlacement = Object.entries(spaces).reduce((a, b) => 
        b[1] > spaces[a[0] as keyof typeof spaces] ? b[0] : a[0]
      );
    }
  }

  // Calculate base position
  switch (actualPlacement) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - offset + scrollY;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2 + scrollX + alignOffset;
      break;
    case 'bottom':
      top = triggerRect.bottom + offset + scrollY;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2 + scrollX + alignOffset;
      break;
    case 'left':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2 + scrollY + alignOffset;
      left = triggerRect.left - tooltipRect.width - offset + scrollX;
      break;
    case 'right':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2 + scrollY + alignOffset;
      left = triggerRect.right + offset + scrollX;
      break;
  }

  // Apply side offset
  if (actualPlacement === 'top' || actualPlacement === 'bottom') {
    left += sideOffset;
  } else {
    top += sideOffset;
  }

  // Collision detection and adjustment
  if (avoidCollisions) {
    const padding = collisionPadding;
    
    // Horizontal collision detection
    if (left < padding + scrollX) {
      left = padding + scrollX;
    } else if (left + tooltipRect.width > viewportWidth - padding + scrollX) {
      left = viewportWidth - tooltipRect.width - padding + scrollX;
    }

    // Vertical collision detection
    if (top < padding + scrollY) {
      // If tooltip doesn't fit above, try below
      if (actualPlacement === 'top') {
        const newTop = triggerRect.bottom + offset + scrollY;
        if (newTop + tooltipRect.height <= viewportHeight - padding + scrollY) {
          top = newTop;
          actualPlacement = 'bottom';
        } else {
          top = padding + scrollY;
        }
      } else {
        top = padding + scrollY;
      }
    } else if (top + tooltipRect.height > viewportHeight - padding + scrollY) {
      // If tooltip doesn't fit below, try above
      if (actualPlacement === 'bottom') {
        const newTop = triggerRect.top - tooltipRect.height - offset + scrollY;
        if (newTop >= padding + scrollY) {
          top = newTop;
          actualPlacement = 'top';
        } else {
          top = viewportHeight - tooltipRect.height - padding + scrollY;
        }
      } else {
        top = viewportHeight - tooltipRect.height - padding + scrollY;
      }
    }
  }

  return { top, left, actualPlacement };
};

/**
 * Enhanced Tooltip component with smart positioning and mobile support
 * 
 * @example
 * ```tsx
 * // Basic tooltip
 * <Tooltip content="This is a tooltip">
 *   <button>Hover me</button>
 * </Tooltip>
 * 
 * // Rich content tooltip
 * <Tooltip 
 *   content={<div><strong>Title</strong><br />Description</div>}
 *   variant="info"
 *   maxWidth={300}
 * >
 *   <button>Info</button>
 * </Tooltip>
 * 
 * // Mobile-friendly tooltip
 * <Tooltip 
 *   content="Touch to see tooltip" 
 *   touchable
 *   trigger="click"
 * >
 *   <button>Touch me</button>
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
  variant = 'default',
  touchable = false,
  sideOffset = 0,
  alignOffset = 0,
  avoidCollisions = true,
  collisionPadding = 8,
  sticky = false,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);
  const [isMobile, setIsMobile] = useState(false);
  
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (open: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(open);
    }
    onOpenChange?.(open);
  };

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isTouchDevice() || window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update position when tooltip opens or window resizes
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const tooltipRect = tooltipRef.current!.getBoundingClientRect();
      const result = calculatePosition(
        triggerRect, 
        tooltipRect, 
        placement, 
        offset,
        sideOffset,
        alignOffset,
        avoidCollisions,
        collisionPadding
      );
      
      setPosition({ top: result.top, left: result.left });
      setActualPlacement(result.actualPlacement);
    };

    // Small delay to ensure tooltip is rendered
    const timeoutId = setTimeout(updatePosition, 0);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, placement, offset, sideOffset, alignOffset, avoidCollisions, collisionPadding]);

  // Handle trigger events
  const handleMouseEnter = () => {
    if (trigger !== 'hover' || disabled || (isMobile && !touchable)) return;
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    showTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (trigger !== 'hover' || (isMobile && !touchable)) return;
    
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
    }

    if (sticky) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 100);
    } else {
      setIsOpen(false);
    }
  };

  const handleClick = () => {
    if (trigger !== 'click' || disabled) return;
    
    // On mobile, always toggle. On desktop, toggle only if not hover trigger
    if (isMobile || trigger === 'click') {
      setIsOpen(!isOpen);
    }
  };

  const handleFocus = () => {
    if (trigger !== 'focus' || disabled) return;
    setIsOpen(true);
  };

  const handleBlur = () => {
    if (trigger !== 'focus') return;
    setIsOpen(false);
  };

  // Handle touch events for mobile
  const handleTouchStart = () => {
    if (!touchable || !isMobile || disabled) return;
    
    if (trigger === 'hover') {
      setIsOpen(true);
    }
  };

  // Handle tooltip hover for sticky behavior
  const handleTooltipMouseEnter = () => {
    if (sticky && hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const handleTooltipMouseLeave = () => {
    if (sticky && trigger === 'hover') {
      setIsOpen(false);
    }
  };

  // Close on outside click for click trigger
  useEffect(() => {
    if ((trigger === 'click' || (isMobile && touchable)) && isOpen) {
      const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
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
      document.addEventListener('touchstart', handleOutsideClick);
      return () => {
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
      };
    }
  }, [trigger, isOpen, isMobile, touchable]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Clone child element and attach ref and events
  const triggerElement = cloneElement(children, {
    ref: (el: HTMLElement) => {
      triggerRef.current = el;
      // Handle existing ref
      const originalRef = (children as any).ref;
      if (originalRef) {
        if (typeof originalRef === 'function') {
          originalRef(el);
        } else {
          originalRef.current = el;
        }
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      children.props.onMouseLeave?.(e);
    },
    onClick: (e: React.MouseEvent) => {
      handleClick();
      children.props.onClick?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      handleFocus();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      handleBlur();
      children.props.onBlur?.(e);
    },
    onTouchStart: (e: React.TouchEvent) => {
      handleTouchStart();
      children.props.onTouchStart?.(e);
    },
    'aria-describedby': isOpen ? 'tooltip' : undefined,
    'aria-expanded': trigger === 'click' ? isOpen : undefined,
  });

  // Variant styles
  const variantStyles = {
    default: 'bg-gray-900 dark:bg-gray-700 text-white border-gray-800 dark:border-gray-600',
    info: 'bg-blue-600 dark:bg-blue-700 text-white border-blue-500 dark:border-blue-600',
    warning: 'bg-yellow-600 dark:bg-yellow-700 text-white border-yellow-500 dark:border-yellow-600',
    error: 'bg-red-600 dark:bg-red-700 text-white border-red-500 dark:border-red-600',
    success: 'bg-green-600 dark:bg-green-700 text-white border-green-500 dark:border-green-600',
  };

  const arrowStyles = {
    default: {
      top: 'border-t-gray-900 dark:border-t-gray-700',
      bottom: 'border-b-gray-900 dark:border-b-gray-700',
      left: 'border-l-gray-900 dark:border-l-gray-700',
      right: 'border-r-gray-900 dark:border-r-gray-700',
    },
    info: {
      top: 'border-t-blue-600 dark:border-t-blue-700',
      bottom: 'border-b-blue-600 dark:border-b-blue-700',
      left: 'border-l-blue-600 dark:border-l-blue-700',
      right: 'border-r-blue-600 dark:border-r-blue-700',
    },
    warning: {
      top: 'border-t-yellow-600 dark:border-t-yellow-700',
      bottom: 'border-b-yellow-600 dark:border-b-yellow-700',
      left: 'border-l-yellow-600 dark:border-l-yellow-700',
      right: 'border-r-yellow-600 dark:border-r-yellow-700',
    },
    error: {
      top: 'border-t-red-600 dark:border-t-red-700',
      bottom: 'border-b-red-600 dark:border-b-red-700',
      left: 'border-l-red-600 dark:border-l-red-700',
      right: 'border-r-red-600 dark:border-r-red-700',
    },
    success: {
      top: 'border-t-green-600 dark:border-t-green-700',
      bottom: 'border-b-green-600 dark:border-b-green-700',
      left: 'border-l-green-600 dark:border-l-green-700',
      right: 'border-r-green-600 dark:border-r-green-700',
    },
  };

  const arrowClasses = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
    left: 'right-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
    right: 'left-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent',
  };

  const tooltipContent = isOpen && !disabled && content ? (
    <div
      ref={tooltipRef}
      id="tooltip"
      role="tooltip"
      className={cn(
        'fixed z-tooltip px-3 py-2 text-sm rounded-lg shadow-lg border',
        'animate-fade-in transition-opacity duration-200',
        variantStyles[variant],
        isMobile && touchable && 'touch-none',
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxWidth: `${maxWidth}px`,
        zIndex: 1070, // Ensure tooltip is above other elements
      }}
      onMouseEnter={handleTooltipMouseEnter}
      onMouseLeave={handleTooltipMouseLeave}
    >
      {content}
      {showArrow && (
        <div
          className={cn(
            'absolute w-0 h-0 border-4',
            arrowClasses[actualPlacement as keyof typeof arrowClasses],
            arrowStyles[variant][actualPlacement as keyof typeof arrowStyles[typeof variant]]
          )}
        />
      )}
    </div>
  ) : null;

  return (
    <>
      {triggerElement}
      {tooltipContent && typeof document !== 'undefined' && createPortal(tooltipContent, document.body)}
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