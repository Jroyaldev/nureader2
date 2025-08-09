import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';
import { Button } from '../Button/Button';

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Callback when the modal should close
   */
  onClose: () => void;
  /**
   * Modal title
   */
  title?: string;
  /**
   * Modal description for accessibility
   */
  description?: string;
  /**
   * Modal content
   */
  children: React.ReactNode;
  /**
   * Size variant - xs for small dialogs, full for mobile full-screen
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /**
   * Position variant for different modal types
   */
  position?: 'center' | 'top' | 'bottom';
  /**
   * Animation variant for entrance/exit
   */
  animation?: 'fade' | 'slide' | 'scale' | 'drawer';
  /**
   * Whether to use full-screen on mobile devices
   */
  mobileFullScreen?: boolean;
  /**
   * Whether clicking outside closes the modal
   */
  closeOnOverlayClick?: boolean;
  /**
   * Whether pressing Escape closes the modal
   */
  closeOnEscape?: boolean;
  /**
   * Whether to show close button
   */
  showCloseButton?: boolean;
  /**
   * Footer content
   */
  footer?: React.ReactNode;
  /**
   * Additional CSS classes for the modal content
   */
  className?: string;
  /**
   * Whether to center the modal vertically (deprecated, use position)
   */
  centered?: boolean;
  /**
   * Custom z-index
   */
  zIndex?: number;
  /**
   * Whether the modal should persist (not close on outside click or escape)
   */
  persistent?: boolean;
  /**
   * Whether to blur the background
   */
  blurBackground?: boolean;
  /**
   * Custom backdrop color/opacity
   */
  backdropClassName?: string;
}

const sizeClasses = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-0 h-full',
};

const positionClasses = {
  center: 'items-center justify-center',
  top: 'items-start justify-center pt-16',
  bottom: 'items-end justify-center pb-4',
};

const animationClasses = {
  fade: {
    enter: 'animate-fade-in',
    exit: 'animate-fade-out',
    modal: 'animate-scale-in',
  },
  slide: {
    enter: 'animate-fade-in',
    exit: 'animate-fade-out',
    modal: 'animate-slide-up',
  },
  scale: {
    enter: 'animate-fade-in',
    exit: 'animate-fade-out',
    modal: 'animate-scale-in',
  },
  drawer: {
    enter: 'animate-fade-in',
    exit: 'animate-fade-out',
    modal: 'animate-slide-up',
  },
};

/**
 * Focus trap hook to manage focus within modal
 */
const useFocusTrap = (isOpen: boolean) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus first focusable element in modal
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }

      // Trap focus within modal
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      };

      document.addEventListener('keydown', handleTabKey);

      return () => {
        document.removeEventListener('keydown', handleTabKey);
        // Restore focus to previous element
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen]);

  return modalRef;
};

/**
 * Enhanced Modal component with comprehensive accessibility support,
 * mobile-first design, and multiple animation variants
 * 
 * @example
 * ```tsx
 * // Basic modal
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 * >
 *   <p>Are you sure you want to proceed?</p>
 * </Modal>
 * 
 * // Mobile-optimized drawer
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Settings"
 *   animation="drawer"
 *   position="bottom"
 *   mobileFullScreen
 * >
 *   <SettingsForm />
 * </Modal>
 * 
 * // Alert dialog
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Delete Item"
 *   size="xs"
 *   animation="scale"
 *   persistent
 *   footer={
 *     <>
 *       <Button variant="outline" onClick={() => setIsOpen(false)}>
 *         Cancel
 *       </Button>
 *       <Button variant="danger" onClick={handleDelete}>Delete</Button>
 *     </>
 *   }
 * >
 *   <p>This action cannot be undone.</p>
 * </Modal>
 * ```
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  position = 'center',
  animation = 'scale',
  mobileFullScreen = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  footer,
  className,
  centered, // Deprecated, use position instead
  zIndex = 50,
  persistent = false,
  blurBackground = true,
  backdropClassName,
}) => {
  const modalRef = useFocusTrap(isOpen);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle Escape key
  useEffect(() => {
    if (isOpen && closeOnEscape && !persistent) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeOnEscape, persistent, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnOverlayClick && !persistent && e.target === overlayRef.current) {
        onClose();
      }
    },
    [closeOnOverlayClick, persistent, onClose]
  );

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Determine position - use centered prop for backward compatibility
  const modalPosition = centered !== undefined ? (centered ? 'center' : 'top') : position;
  
  // Determine if mobile full-screen should be applied
  const isMobileFullScreen = mobileFullScreen && size !== 'full';
  
  const modalContent = (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-50 flex p-4',
        // Background and blur
        blurBackground ? 'backdrop-blur-sm' : '',
        backdropClassName || 'bg-black/50',
        // Position
        positionClasses[modalPosition],
        // Animation
        animationClasses[animation].enter,
        // Mobile adjustments
        isMobileFullScreen && 'sm:p-4 p-0'
      )}
      style={{ zIndex }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div
        ref={modalRef}
        className={cn(
          // Base styles
          'relative bg-white dark:bg-gray-900 shadow-2xl',
          'w-full max-h-[calc(100vh-2rem)]',
          // Size classes
          sizeClasses[size],
          // Border radius - conditional for full-screen mobile
          isMobileFullScreen 
            ? 'sm:rounded-xl rounded-none' 
            : size === 'full' 
              ? 'rounded-none' 
              : 'rounded-xl',
          // Animation
          animationClasses[animation].modal,
          // Mobile full-screen adjustments
          isMobileFullScreen && 'sm:max-h-[calc(100vh-2rem)] max-h-screen sm:h-auto h-full',
          // Drawer specific styles
          animation === 'drawer' && modalPosition === 'bottom' && 'rounded-t-xl rounded-b-none',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={cn(
            'flex items-center justify-between border-b border-gray-200 dark:border-gray-700',
            // Responsive padding
            isMobileFullScreen ? 'p-4 sm:p-6' : 'p-6',
            // Drawer specific styles
            animation === 'drawer' && 'pb-4'
          )}>
            {title && (
              <h2
                id="modal-title"
                className={cn(
                  'font-semibold text-gray-900 dark:text-white',
                  // Responsive text size
                  size === 'xs' ? 'text-lg' : 'text-xl'
                )}
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  'ml-auto p-2 rounded-lg transition-colors',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  'dark:focus:ring-offset-gray-900'
                )}
                aria-label="Close modal"
                type="button"
              >
                <svg
                  className="w-5 h-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Description for screen readers */}
        {description && (
          <div id="modal-description" className="sr-only">
            {description}
          </div>
        )}

        {/* Content */}
        <div className={cn(
          'overflow-y-auto',
          // Responsive padding
          isMobileFullScreen ? 'p-4 sm:p-6' : 'p-6',
          // Height constraints
          footer 
            ? 'max-h-[calc(100vh-300px)]' 
            : title || showCloseButton 
              ? 'max-h-[calc(100vh-200px)]' 
              : 'max-h-[calc(100vh-100px)]',
          // Mobile full-screen adjustments
          isMobileFullScreen && footer && 'sm:max-h-[calc(100vh-300px)] max-h-[calc(100vh-200px)]',
          // Drawer specific styles
          animation === 'drawer' && 'flex-1'
        )}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={cn(
            'flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700',
            // Responsive padding
            isMobileFullScreen ? 'p-4 sm:p-6' : 'p-6',
            // Mobile stacking
            'flex-col-reverse sm:flex-row',
            // Drawer specific styles
            animation === 'drawer' && 'pt-4'
          )}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Portal to body
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
};

Modal.displayName = 'Modal';

/**
 * Enhanced Confirm Dialog component with better UX and accessibility
 */
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
  icon?: React.ReactNode;
  persistent?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  icon,
  persistent = false,
}) => {
  const variantConfig = {
    danger: {
      icon: (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      buttonVariant: 'danger' as const,
      bgColor: 'bg-red-50 dark:bg-red-950/20',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      buttonVariant: 'primary' as const,
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    },
    info: {
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      buttonVariant: 'primary' as const,
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    success: {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      buttonVariant: 'primary' as const,
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
  };

  const config = variantConfig[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      animation="scale"
      persistent={persistent}
      footer={
        <div className="flex gap-3 w-full sm:w-auto sm:flex-row flex-col-reverse">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="sm:w-auto w-full"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={onConfirm}
            loading={loading}
            className="sm:w-auto w-full"
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className={cn('flex gap-4 p-4 rounded-lg', config.bgColor)}>
        <div className="flex-shrink-0">
          {icon || config.icon}
        </div>
        <div className="flex-1">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};

ConfirmDialog.displayName = 'ConfirmDialog';

/**
 * Alert Dialog component for simple notifications
 */
export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  variant = 'info',
  icon,
}) => {
  const variantConfig = {
    info: {
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    success: {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    },
    error: {
      icon: (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-red-50 dark:bg-red-950/20',
    },
  };

  const config = variantConfig[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      animation="scale"
      footer={
        <Button
          variant="primary"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          {buttonText}
        </Button>
      }
    >
      <div className={cn('flex gap-4 p-4 rounded-lg', config.bgColor)}>
        <div className="flex-shrink-0">
          {icon || config.icon}
        </div>
        <div className="flex-1">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};

AlertDialog.displayName = 'AlertDialog';

/**
 * Bottom Sheet component for mobile-first interactions
 */
export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
  showHandle?: boolean;
  persistent?: boolean;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  showHandle = true,
  persistent = false,
  className,
}) => {
  const heightClasses = {
    auto: 'max-h-[80vh]',
    half: 'h-[50vh]',
    full: 'h-[90vh]',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="full"
      position="bottom"
      animation="drawer"
      persistent={persistent}
      showCloseButton={false}
      className={cn(
        'mx-0 mb-0 rounded-t-xl rounded-b-none',
        heightClasses[height],
        className
      )}
      backdropClassName="bg-black/30"
    >
      <div className="flex flex-col h-full">
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center py-3">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}
        
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {children}
        </div>
      </div>
    </Modal>
  );
};

BottomSheet.displayName = 'BottomSheet';