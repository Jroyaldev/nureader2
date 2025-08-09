import React, { useState, useRef, useEffect, cloneElement } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface PopoverProps {
  /**
   * Content to display in the popover
   */
  content: React.ReactNode;
  /**
   * Element that triggers the popover
   */
  children: React.ReactElement;
  /**
   * Placement of the popover relative to the trigger
   */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /**
   * Whether the popover is disabled
   */
  disabled?: boolean;
  /**
   * Additional CSS classes for the popover
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
   * Maximum width of the popover
   */
  maxWidth?: number;
  /**
   * Maximum height of the popover
   */
  maxHeight?: number;
  /**
   * Trigger mode
   */
  trigger?: 'click' | 'hover' | 'focus' | 'manual';
  /**
   * Whether popover is controlled externally
   */
  isOpen?: boolean;
  /**
   * Callback when popover visibility changes
   */
  onOpenChange?: (open: boolean) => void;
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
   * Whether to close on outside click
   */
  closeOnOutsideClick?: boolean;
  /**
   * Whether to close on escape key
   */
  closeOnEscape?: boolean;
  /**
   * Whether popover should be modal (with backdrop)
   */
  modal?: boolean;
  /**
   * Animation variant
   */
  animation?: 'fade' | 'scale' | 'slide';
}

/**
 * Detect if device supports touch
 */
const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Calculate popover position with smart collision detection
 */
const calculatePosition = (
  triggerRect: DOMRect,
  popoverRect: DOMRect,
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

    // Check if popover fits in each direction
    const fits = {
      top: spaces.top >= popoverRect.height + offset,
      bottom: spaces.bottom >= popoverRect.height + offset,
      left: spaces.left >= popoverRect.width + offset,
      right: spaces.right >= popoverRect.width + offset,
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
      top = triggerRect.top - popoverRect.height - offset + scrollY;
      left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2 + scrollX + alignOffset;
      break;
    case 'bottom':
      top = triggerRect.bottom + offset + scrollY;
      left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2 + scrollX + alignOffset;
      break;
    case 'left':
      top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2 + scrollY + alignOffset;
      left = triggerRect.left - popoverRect.width - offset + scrollX;
      break;
    case 'right':
      top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2 + scrollY + alignOffset;
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
    } else if (left + popoverRect.width > viewportWidth - padding + scrollX) {
      left = viewportWidth - popoverRect.width - padding + scrollX;
    }

    // Vertical collision detection
    if (top < padding + scrollY) {
      // If popover doesn't fit above, try below
      if (actualPlacement === 'top') {
        const newTop = triggerRect.bottom + offset + scrollY;
        if (newTop + popoverRect.height <= viewportHeight - padding + scrollY) {
          top = newTop;
          actualPlacement = 'bottom';
        } else {
          top = padding + scrollY;
        }
      } else {
        top = padding + scrollY;
      }
    } else if (top + popoverRect.height > viewportHeight - padding + scrollY) {
      // If popover doesn't fit below, try above
      if (actualPlacement === 'bottom') {
        const newTop = triggerRect.top - popoverRect.height - offset + scrollY;
        if (newTop >= padding + scrollY) {
          top = newTop;
          actualPlacement = 'top';
        } else {
          top = viewportHeight - popoverRect.height - padding + scrollY;
        }
      } else {
        top = viewportHeight - popoverRect.height - padding + scrollY;
      }
    }
  }

  return { top, left, actualPlacement };
};

/**
 * Enhanced Popover component for complex interactive content
 * 
 * @example
 * ```tsx
 * // Basic popover
 * <Popover content={<div>Popover content</div>}>
 *   <button>Click me</button>
 * </Popover>
 * 
 * // Complex interactive popover
 * <Popover 
 *   content={
 *     <div className="p-4">
 *       <h3>Settings</h3>
 *       <button>Save</button>
 *       <button>Cancel</button>
 *     </div>
 *   }
 *   maxWidth={300}
 *   trigger="click"
 * >
 *   <button>Settings</button>
 * </Popover>
 * 
 * // Controlled popover
 * <Popover 
 *   content={<div>Controlled content</div>}
 *   isOpen={isOpen}
 *   onOpenChange={setIsOpen}
 * >
 *   <button>Target</button>
 * </Popover>
 * ```
 */
export const Popover: React.FC<PopoverProps> = ({
  content,
  children,
  placement = 'bottom',
  disabled = false,
  className,
  offset = 8,
  showArrow = true,
  maxWidth = 320,
  maxHeight,
  trigger = 'click',
  isOpen: controlledIsOpen,
  onOpenChange,
  sideOffset = 0,
  alignOffset = 0,
  avoidCollisions = true,
  collisionPadding = 8,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  modal = false,
  animation = 'scale',
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);
  const [isMobile, setIsMobile] = useState(false);
  
  const triggerRef = useRef<HTMLElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
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

  // Update position when popover opens or window resizes
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !popoverRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const popoverRect = popoverRef.current!.getBoundingClientRect();
      const result = calculatePosition(
        triggerRect, 
        popoverRect, 
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

    // Small delay to ensure popover is rendered
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
    if (trigger !== 'hover' || disabled) return;
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    showTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (trigger !== 'hover') return;
    
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 100);
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

  // Handle popover hover for sticky behavior
  const handlePopoverMouseEnter = () => {
    if (trigger === 'hover' && hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const handlePopoverMouseLeave = () => {
    if (trigger === 'hover') {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (closeOnOutsideClick && isOpen) {
      const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
        if (
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node) &&
          popoverRef.current &&
          !popoverRef.current.contains(e.target as Node)
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
  }, [closeOnOutsideClick, isOpen]);

  // Close on escape key
  useEffect(() => {
    if (closeOnEscape && isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [closeOnEscape, isOpen]);

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
    'aria-expanded': isOpen,
    'aria-haspopup': 'dialog',
  });

  const animationClasses = {
    fade: 'animate-fade-in',
    scale: 'animate-scale-in',
    slide: actualPlacement === 'top' ? 'animate-slide-down' : 
           actualPlacement === 'bottom' ? 'animate-slide-up' :
           actualPlacement === 'left' ? 'animate-slide-right' : 'animate-slide-left',
  };

  const arrowClasses = {
    top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-white dark:border-t-gray-800',
    bottom: 'top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-white dark:border-b-gray-800',
    left: 'right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-white dark:border-l-gray-800',
    right: 'left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-white dark:border-r-gray-800',
  };

  const popoverContent = isOpen && !disabled && content && (
    <>
      {modal && (
        <div 
          className="fixed inset-0 z-popover bg-black/20 dark:bg-black/40"
          style={{ zIndex: 1059 }}
        />
      )}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal={modal}
        className={cn(
          'fixed z-popover bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
          'transition-all duration-200',
          animationClasses[animation],
          isMobile && 'touch-none',
          className
        )}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          maxWidth: `${maxWidth}px`,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
          zIndex: 1060, // Ensure popover is above backdrop
        }}
        onMouseEnter={handlePopoverMouseEnter}
        onMouseLeave={handlePopoverMouseLeave}
      >
        {content}
        {showArrow && (
          <div
            className={cn(
              'absolute w-0 h-0 border-6',
              arrowClasses[actualPlacement as keyof typeof arrowClasses]
            )}
          />
        )}
      </div>
    </>
  );

  return (
    <>
      {triggerElement}
      {typeof window !== 'undefined' && createPortal(popoverContent, document.body)}
    </>
  );
};

Popover.displayName = 'Popover';

/**
 * Popover provider for managing multiple popovers
 */
export const PopoverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

PopoverProvider.displayName = 'PopoverProvider';