// Button components
export { Button, ButtonGroup } from './Button/Button';
export type { ButtonProps, ButtonGroupProps } from './Button/Button';

// Modal components
export { Modal, ConfirmDialog } from './Modal/Modal';
export type { ModalProps, ConfirmDialogProps } from './Modal/Modal';

// Tooltip components
export { Tooltip, TooltipProvider } from './Tooltip/Tooltip';
export type { TooltipProps } from './Tooltip/Tooltip';

// Loading components
export {
  Spinner,
  LoadingOverlay,
  Skeleton,
  CardSkeleton,
  ProgressBar,
  DotsLoader,
} from './Loading/Loading';
export type {
  SpinnerProps,
  LoadingOverlayProps,
  SkeletonProps,
  CardSkeletonProps,
  ProgressBarProps,
} from './Loading/Loading';

// Re-export existing components that are already implemented
export { ErrorBoundary } from './ErrorBoundary';
export { AsyncErrorBoundary } from './AsyncErrorBoundary';

// Export Loading component if it exists separately
import React from 'react';
import { Spinner } from './Loading/Loading';

export const Loading: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center min-h-[200px]">
    <Spinner size="lg" />
    {message && (
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{message}</p>
    )}
  </div>
);