/**
 * FormField Component
 * 
 * A wrapper component that provides form validation states,
 * error messaging, and consistent field styling.
 */

import React from 'react';
import { cn } from '../../../lib/utils';

export interface FormFieldProps {
  children: React.ReactElement;
  label?: string;
  description?: string;
  error?: string | string[];
  success?: string;
  warning?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  errorClassName?: string;
  successClassName?: string;
  warningClassName?: string;
  
  // Layout options
  layout?: 'vertical' | 'horizontal';
  labelPosition?: 'top' | 'left' | 'floating';
  
  // Accessibility
  id?: string;
  'aria-describedby'?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  children,
  label,
  description,
  error,
  success,
  warning,
  required = false,
  disabled = false,
  className,
  labelClassName,
  descriptionClassName,
  errorClassName,
  successClassName,
  warningClassName,
  layout = 'vertical',
  labelPosition = 'top',
  id,
  'aria-describedby': ariaDescribedBy,
}) => {
  // Generate unique IDs for accessibility
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const successId = success ? `${fieldId}-success` : undefined;
  const warningId = warning ? `${fieldId}-warning` : undefined;
  
  // Combine aria-describedby IDs
  const combinedAriaDescribedBy = [
    ariaDescribedBy,
    descriptionId,
    errorId,
    successId,
    warningId,
  ].filter(Boolean).join(' ') || undefined;
  
  // Determine validation state
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success) && !hasError;
  const hasWarning = Boolean(warning) && !hasError && !hasSuccess;
  
  // Clone child element with additional props
  const childElement = React.cloneElement(children, {
    id: fieldId,
    'aria-describedby': combinedAriaDescribedBy,
    'aria-invalid': hasError,
    ...(hasError && { error: true }),
    ...(hasSuccess && { success: true }),
    disabled: disabled || children.props.disabled,
  });
  
  // Layout classes
  const containerClasses = cn(
    'w-full',
    layout === 'horizontal' && 'flex items-start gap-4',
    className
  );
  
  const labelClasses = cn(
    'block text-sm font-medium transition-colors',
    disabled ? 'text-gray-400' : 'text-gray-700',
    hasError && 'text-error-600',
    hasSuccess && 'text-success-600',
    hasWarning && 'text-warning-600',
    layout === 'horizontal' && 'flex-shrink-0 w-32 pt-2',
    labelPosition === 'floating' && 'absolute top-2 left-3 bg-white px-1 text-xs',
    labelClassName
  );
  
  const fieldContainerClasses = cn(
    layout === 'vertical' && 'space-y-1',
    layout === 'horizontal' && 'flex-1 min-w-0'
  );
  
  const descriptionClasses = cn(
    'text-sm text-gray-600',
    disabled && 'text-gray-400',
    descriptionClassName
  );
  
  const messageClasses = cn(
    'text-sm flex items-start gap-2 mt-1',
    errorClassName,
    successClassName,
    warningClassName
  );
  
  const errorClasses = cn(
    messageClasses,
    'text-error-600',
    errorClassName
  );
  
  const successClasses = cn(
    messageClasses,
    'text-success-600',
    successClassName
  );
  
  const warningClasses = cn(
    messageClasses,
    'text-warning-600',
    warningClassName
  );
  
  // Error icon
  const ErrorIcon = () => (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
  
  // Success icon
  const SuccessIcon = () => (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
  
  // Warning icon
  const WarningIcon = () => (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
  
  return (
    <div className={containerClasses}>
      {/* Label */}
      {label && labelPosition !== 'floating' && (
        <label htmlFor={fieldId} className={labelClasses}>
          {label}
          {required && (
            <span className="text-error-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      
      <div className={fieldContainerClasses}>
        {/* Field container with floating label */}
        <div className={cn(
          labelPosition === 'floating' && 'relative'
        )}>
          {/* Floating label */}
          {label && labelPosition === 'floating' && (
            <label htmlFor={fieldId} className={labelClasses}>
              {label}
              {required && (
                <span className="text-error-500 ml-1" aria-label="required">
                  *
                </span>
              )}
            </label>
          )}
          
          {/* Input field */}
          {childElement}
        </div>
        
        {/* Description */}
        {description && (
          <p id={descriptionId} className={descriptionClasses}>
            {description}
          </p>
        )}
        
        {/* Error messages */}
        {error && (
          <div id={errorId} className={errorClasses} role="alert">
            <ErrorIcon />
            <div className="flex-1">
              {Array.isArray(error) ? (
                <ul className="list-none space-y-1">
                  {error.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              ) : (
                <span>{error}</span>
              )}
            </div>
          </div>
        )}
        
        {/* Success message */}
        {success && !error && (
          <div id={successId} className={successClasses}>
            <SuccessIcon />
            <span>{success}</span>
          </div>
        )}
        
        {/* Warning message */}
        {warning && !error && !success && (
          <div id={warningId} className={warningClasses}>
            <WarningIcon />
            <span>{warning}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export { FormField };
export default FormField;