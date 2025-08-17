"use client";

import React, { 
  useEffect, 
  useRef, 
  useCallback, 
  useState,
  createContext,
  useContext
} from 'react';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Panel Context for composition
interface PanelContextValue {
  onClose?: () => void;
  panelId: string;
}

const PanelContext = createContext<PanelContextValue | null>(null);

export const usePanelContext = () => {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error('Panel components must be used within UnifiedPanel');
  }
  return context;
};

// Hook for focus management and accessibility
const useFocusTrap = (
  isOpen: boolean, 
  containerRef: React.RefObject<HTMLElement>,
  focusTrap: boolean = true
) => {
  const previousElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !focusTrap) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Store previously focused element
    previousElementRef.current = document.activeElement as HTMLElement;
    
    // Focus first interactive element
    const firstElement = container.querySelector(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    
    if (firstElement) {
      setTimeout(() => firstElement.focus(), 100);
    }
    
    // Trap focus within container
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      const focusableElements = container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;
      
      const first = focusableElements[0] as HTMLElement;
      const last = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    
    container.addEventListener('keydown', handleTab);
    
    return () => {
      container.removeEventListener('keydown', handleTab);
      // Restore focus to previously focused element
      if (previousElementRef.current) {
        previousElementRef.current.focus();
      }
    };
  }, [isOpen, focusTrap]);
};

// Hook for panel state management with animations
const usePanelState = (isOpen: boolean) => {
  const [panelState, setPanelState] = useState<'entering' | 'entered' | 'exiting' | 'exited'>('exited');
  
  useEffect(() => {
    if (isOpen) {
      setPanelState('entering');
      // Trigger entered state after a frame
      const timer = setTimeout(() => setPanelState('entered'), 16);
      return () => clearTimeout(timer);
    } else {
      setPanelState('exiting');
      // Trigger exited state after animation completes
      const timer = setTimeout(() => setPanelState('exited'), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  return panelState;
};

// Panel Header Component
interface PanelHeaderProps {
  children: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ 
  children, 
  showCloseButton = true,
  className 
}) => {
  const { onClose, panelId } = usePanelContext();
  
  return (
    <div className={cn('unified-panel__header', className)}>
      <div className="flex items-center justify-between w-full">
        <div className="flex-1">{children}</div>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 rounded-lg transition-colors touch-manipulation"
            aria-label="Close panel"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

// Panel Content Component
interface PanelContentProps {
  children: React.ReactNode;
  className?: string;
}

export const PanelContent: React.FC<PanelContentProps> = ({ children, className }) => {
  return (
    <div className={cn('unified-panel__content', className)}>
      {children}
    </div>
  );
};

// Panel Footer Component
interface PanelFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const PanelFooter: React.FC<PanelFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('unified-panel__footer', className)}>
      {children}
    </div>
  );
};

// Main UnifiedPanel Component
interface UnifiedPanelProps {
  // Layout
  variant?: 'modal' | 'sidebar' | 'dropdown' | 'bottomSheet';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'auto';
  position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  
  // Behavior
  isOpen: boolean;
  onClose?: () => void;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  
  // Styling
  blur?: boolean;
  shadow?: boolean;
  border?: boolean;
  
  // Content
  title?: string;
  children: React.ReactNode;
  
  // Accessibility
  ariaLabel?: string;
  focusTrap?: boolean;
  role?: string;
  
  // Advanced
  className?: string;
  overlayClassName?: string;
  id?: string;
}

const UnifiedPanel: React.FC<UnifiedPanelProps> = ({
  variant = 'modal',
  size = 'md',
  position = 'center',
  isOpen,
  onClose,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  blur = true,
  shadow = true,
  border = true,
  title,
  children,
  ariaLabel,
  focusTrap = true,
  role = 'dialog',
  className,
  overlayClassName,
  id
}) => {
  const { isMobile } = useBreakpoint();
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelState = usePanelState(isOpen);
  const panelId = id || `panel-${Math.random().toString(36).substr(2, 9)}`;
  
  // Adapt variant for mobile
  const adaptedVariant = isMobile && variant === 'sidebar' ? 'bottomSheet' : variant;
  
  // Focus management
  useFocusTrap(isOpen, panelRef, focusTrap);
  
  // Keyboard event handling
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape && onClose) {
        e.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen || adaptedVariant === 'dropdown') return;
    
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, adaptedVariant]);
  
  // Handle overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current && closeOnOverlayClick && onClose) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);
  
  // Don't render if not open and animation has completed
  if (panelState === 'exited') {
    return null;
  }
  
  // Size classes
  const sizeClasses = {
    sm: 'w-80 max-h-96',
    md: 'w-96 max-h-[600px]',
    lg: 'w-[480px] max-h-[700px]',
    xl: 'w-[600px] max-h-[800px]',
    auto: 'w-auto h-auto'
  };
  
  // Variant classes
  const variantClasses = {
    modal: 'unified-panel--modal',
    sidebar: 'unified-panel--sidebar',
    dropdown: 'unified-panel--dropdown',
    bottomSheet: 'unified-panel--bottomSheet'
  };
  
  // Position classes
  const positionClasses = {
    left: 'position-left',
    right: 'position-right',
    top: 'position-top',
    bottom: 'position-bottom',
    center: 'position-center'
  };
  
  const showOverlay = adaptedVariant !== 'dropdown';
  
  const contextValue: PanelContextValue = {
    onClose,
    panelId
  };
  
  return (
    <PanelContext.Provider value={contextValue}>
      {/* Overlay */}
      {showOverlay && (
        <div
          ref={overlayRef}
          className={cn(
            'unified-panel-overlay',
            `state-${panelState}`,
            overlayClassName
          )}
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}
      
      {/* Panel */}
      <div
        ref={panelRef}
        id={panelId}
        role={role}
        aria-modal={adaptedVariant === 'modal'}
        aria-label={ariaLabel || title}
        aria-labelledby={title ? `${panelId}-title` : undefined}
        tabIndex={-1}
        className={cn(
          'unified-panel',
          variantClasses[adaptedVariant],
          variant === 'sidebar' && positionClasses[position],
          !isMobile && variant !== 'dropdown' && sizeClasses[size],
          `state-${panelState}`,
          !blur && 'no-blur',
          !shadow && 'no-shadow',
          !border && 'no-border',
          className
        )}
      >
        {children}
      </div>
    </PanelContext.Provider>
  );
};

// Title component for consistent styling
interface PanelTitleProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export const PanelTitle: React.FC<PanelTitleProps> = ({ 
  children, 
  level = 2, 
  className 
}) => {
  const { panelId } = usePanelContext();
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  return (
    <Tag 
      id={`${panelId}-title`}
      className={cn(
        'text-lg font-semibold text-foreground',
        className
      )}
    >
      {children}
    </Tag>
  );
};

export default UnifiedPanel;
export { UnifiedPanel, PanelHeader, PanelContent, PanelFooter, PanelTitle };
export type { UnifiedPanelProps, PanelHeaderProps, PanelContentProps, PanelFooterProps };