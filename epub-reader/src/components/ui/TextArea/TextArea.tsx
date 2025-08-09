/**
 * TextArea Component
 * 
 * An enhanced textarea component with auto-resize, character counting,
 * and form validation states.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../../lib/utils';

export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled';
  resize?: 'none' | 'vertical' | 'horizontal' | 'both' | 'auto';
  
  // Auto-resize options
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
  
  // Character counting
  maxLength?: number;
  showCharacterCount?: boolean;
  
  // Validation states
  error?: boolean;
  success?: boolean;
  
  // Styling
  className?: string;
  textareaClassName?: string;
  
  // Event handlers
  onChange?: (value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  
  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({
    value = '',
    placeholder,
    disabled = false,
    readOnly = false,
    size = 'md',
    variant = 'default',
    resize = 'vertical',
    autoResize = false,
    minRows = 3,
    maxRows = 10,
    maxLength,
    showCharacterCount = false,
    error = false,
    success = false,
    className,
    textareaClassName,
    onChange,
    onFocus,
    onBlur,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const [textareaHeight, setTextareaHeight] = useState<number | undefined>();
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const hiddenTextareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Combine refs
    const combinedRef = useCallback((node: HTMLTextAreaElement) => {
      textareaRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);
    
    // Update internal value when prop changes
    useEffect(() => {
      setInternalValue(value);
    }, [value]);
    
    // Auto-resize functionality
    const calculateHeight = useCallback(() => {
      if (!autoResize || !textareaRef.current || !hiddenTextareaRef.current) return;
      
      const textarea = textareaRef.current;
      const hiddenTextarea = hiddenTextareaRef.current;
      
      // Copy styles to hidden textarea
      const computedStyle = window.getComputedStyle(textarea);
      hiddenTextarea.style.width = computedStyle.width;
      hiddenTextarea.style.fontSize = computedStyle.fontSize;
      hiddenTextarea.style.fontFamily = computedStyle.fontFamily;
      hiddenTextarea.style.fontWeight = computedStyle.fontWeight;
      hiddenTextarea.style.lineHeight = computedStyle.lineHeight;
      hiddenTextarea.style.letterSpacing = computedStyle.letterSpacing;
      hiddenTextarea.style.padding = computedStyle.padding;
      hiddenTextarea.style.border = computedStyle.border;
      hiddenTextarea.style.boxSizing = computedStyle.boxSizing;
      
      // Set content and measure height
      hiddenTextarea.value = internalValue || placeholder || '';
      const scrollHeight = hiddenTextarea.scrollHeight;
      
      // Calculate line height
      const lineHeight = parseInt(computedStyle.lineHeight) || 20;
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;
      
      // Set height within bounds
      const newHeight = Math.max(minHeight, Math.min(maxHeight, scrollHeight));
      setTextareaHeight(newHeight);
    }, [internalValue, placeholder, minRows, maxRows, autoResize]);
    
    // Recalculate height when content changes
    useEffect(() => {
      if (autoResize) {
        calculateHeight();
      }
    }, [calculateHeight, autoResize]);
    
    // Recalculate height on window resize
    useEffect(() => {
      if (!autoResize) return;
      
      const handleResize = () => calculateHeight();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [calculateHeight, autoResize]);
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      
      // Enforce max length
      if (maxLength && newValue.length > maxLength) {
        return;
      }
      
      setInternalValue(newValue);
      onChange?.(newValue, e);
    };
    
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };
    
    // Character count
    const characterCount = internalValue.length;
    const isNearLimit = maxLength && characterCount > maxLength * 0.8;
    const isOverLimit = maxLength && characterCount > maxLength;
    
    // Size variants
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg',
    };
    
    // Variant classes
    const variantClasses = {
      default: 'bg-white border-gray-200',
      filled: 'bg-gray-50 border-transparent',
    };
    
    // Resize classes
    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
      auto: 'resize-none', // Auto-resize handles this
    };
    
    const currentResize = autoResize ? 'auto' : resize;
    
    const textareaClasses = cn(
      // Base styles
      'w-full rounded-lg border transition-all duration-200',
      'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
      'read-only:bg-gray-50 read-only:cursor-default',
      
      // Size
      sizeClasses[size],
      
      // Variant
      variantClasses[variant],
      
      // Resize
      resizeClasses[currentResize],
      
      // States
      isFocused && 'ring-2 ring-primary-500/20 border-primary-500',
      error && 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
      success && 'border-success-500 focus:border-success-500 focus:ring-success-500/20',
      
      textareaClassName
    );
    
    const containerClasses = cn(
      'relative w-full',
      className
    );
    
    return (
      <div className={containerClasses}>
        {/* Main textarea */}
        <textarea
          ref={combinedRef}
          value={internalValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={textareaClasses}
          style={autoResize ? { height: textareaHeight } : undefined}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid || error}
          maxLength={maxLength}
          {...props}
        />
        
        {/* Hidden textarea for auto-resize calculation */}
        {autoResize && (
          <textarea
            ref={hiddenTextareaRef}
            className="absolute top-0 left-0 invisible pointer-events-none"
            style={{
              height: 'auto',
              minHeight: 'auto',
              maxHeight: 'none',
              resize: 'none',
            }}
            tabIndex={-1}
            aria-hidden="true"
          />
        )}
        
        {/* Character count */}
        {showCharacterCount && maxLength && (
          <div className="flex justify-end mt-1">
            <span
              className={cn(
                'text-xs transition-colors',
                isOverLimit && 'text-error-500',
                isNearLimit && !isOverLimit && 'text-warning-500',
                !isNearLimit && 'text-gray-500'
              )}
            >
              {characterCount}/{maxLength}
            </span>
          </div>
        )}
        
        {/* Character count without limit */}
        {showCharacterCount && !maxLength && (
          <div className="flex justify-end mt-1">
            <span className="text-xs text-gray-500">
              {characterCount} characters
            </span>
          </div>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export { TextArea };
export default TextArea;