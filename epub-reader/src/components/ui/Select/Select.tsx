/**
 * Select Component
 * 
 * A custom select component with mobile-friendly options,
 * custom styling, and accessibility support.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
}

export interface SelectProps {
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled';
  error?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  maxHeight?: number;
  className?: string;
  triggerClassName?: string;
  optionsClassName?: string;
  
  // Event handlers
  onChange?: (value: string | string[]) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onSearch?: (query: string) => void;
  
  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({
    value = '',
    placeholder = 'Select an option...',
    options = [],
    disabled = false,
    loading = false,
    size = 'md',
    variant = 'default',
    error = false,
    multiple = false,
    searchable = false,
    clearable = false,
    maxHeight = 256,
    className,
    triggerClassName,
    optionsClassName,
    onChange,
    onFocus,
    onBlur,
    onSearch,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedValues, setSelectedValues] = useState<string[]>(
      multiple ? (Array.isArray(value) ? value : value ? [value] : []) : value ? [value] : []
    );
    const [focusedIndex, setFocusedIndex] = useState(-1);
    
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // Combine refs
    const combinedRef = useCallback((node: HTMLButtonElement) => {
      triggerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);
    
    // Update selected values when prop changes
    useEffect(() => {
      const newValues = multiple 
        ? (Array.isArray(value) ? value : value ? [value] : [])
        : value ? [value] : [];
      setSelectedValues(newValues);
    }, [value, multiple]);
    
    // Filter options based on search query
    const filteredOptions = searchable && searchQuery
      ? options.filter(option =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;
    
    // Get selected option(s) for display
    const selectedOptions = options.filter(option => 
      selectedValues.includes(option.value)
    );
    
    const handleToggle = () => {
      if (disabled) return;
      
      setIsOpen(!isOpen);
      if (!isOpen) {
        onFocus?.();
        setFocusedIndex(-1);
        // Focus search input if searchable
        if (searchable) {
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
      } else {
        onBlur?.();
        setSearchQuery('');
      }
    };
    
    const handleOptionSelect = (option: SelectOption) => {
      if (option.disabled) return;
      
      let newValues: string[];
      
      if (multiple) {
        if (selectedValues.includes(option.value)) {
          newValues = selectedValues.filter(v => v !== option.value);
        } else {
          newValues = [...selectedValues, option.value];
        }
        setSelectedValues(newValues);
        onChange?.(newValues);
      } else {
        newValues = [option.value];
        setSelectedValues(newValues);
        onChange?.(option.value);
        setIsOpen(false);
        onBlur?.();
      }
    };
    
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedValues([]);
      onChange?.(multiple ? [] : '');
    };
    
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      onSearch?.(query);
      setFocusedIndex(-1);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      
      switch (e.key) {
        case 'Enter':
        case ' ':
          if (!isOpen) {
            e.preventDefault();
            setIsOpen(true);
            onFocus?.();
          } else if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
            e.preventDefault();
            handleOptionSelect(filteredOptions[focusedIndex]);
          }
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            onFocus?.();
          } else {
            setFocusedIndex(prev => 
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
          }
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setFocusedIndex(prev => 
              prev > 0 ? prev - 1 : filteredOptions.length - 1
            );
          }
          break;
          
        case 'Escape':
          if (isOpen) {
            setIsOpen(false);
            onBlur?.();
            setSearchQuery('');
            triggerRef.current?.focus();
          }
          break;
      }
    };
    
    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          triggerRef.current &&
          optionsRef.current &&
          !triggerRef.current.contains(event.target as Node) &&
          !optionsRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          onBlur?.();
          setSearchQuery('');
        }
      };
      
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen, onBlur]);
    
    // Size variants
    const sizeClasses = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-4 text-base',
      lg: 'h-13 px-5 text-lg',
    };
    
    // Variant classes
    const variantClasses = {
      default: 'bg-white border-gray-200',
      filled: 'bg-gray-50 border-transparent',
    };
    
    const triggerClasses = cn(
      // Base styles
      'w-full rounded-lg border transition-all duration-200',
      'flex items-center justify-between gap-2',
      'text-left focus:outline-none focus:ring-2 focus:ring-primary-500/20',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
      
      // Size
      sizeClasses[size],
      
      // Variant
      variantClasses[variant],
      
      // States
      isOpen && 'ring-2 ring-primary-500/20 border-primary-500',
      error && 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
      
      triggerClassName
    );
    
    const optionsClasses = cn(
      'absolute top-full left-0 right-0 z-50 mt-1',
      'bg-white border border-gray-200 rounded-lg shadow-lg',
      'overflow-hidden',
      'animate-in fade-in-0 zoom-in-95 duration-100',
      optionsClassName
    );
    
    const getDisplayText = () => {
      if (selectedOptions.length === 0) {
        return placeholder;
      }
      
      if (multiple) {
        if (selectedOptions.length === 1) {
          return selectedOptions[0].label;
        }
        return `${selectedOptions.length} selected`;
      }
      
      return selectedOptions[0].label;
    };
    
    return (
      <div className={cn('relative w-full', className)}>
        {/* Trigger Button */}
        <button
          ref={combinedRef}
          type="button"
          className={triggerClasses}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid || error}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          {...props}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Selected option icon */}
            {!multiple && selectedOptions.length > 0 && selectedOptions[0].icon && (
              <div className="flex-shrink-0 text-gray-500">
                {selectedOptions[0].icon}
              </div>
            )}
            
            {/* Display text */}
            <span
              className={cn(
                'truncate',
                selectedOptions.length === 0 && 'text-gray-400'
              )}
            >
              {getDisplayText()}
            </span>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Clear button */}
            {clearable && selectedOptions.length > 0 && !disabled && (
              <div
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                aria-label="Clear selection"
                role="button"
                tabIndex={-1}
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            
            {/* Loading spinner */}
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-500" />
            )}
            
            {/* Chevron */}
            {!loading && (
              <svg
                className={cn(
                  'h-4 w-4 text-gray-400 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </button>
        
        {/* Options Dropdown */}
        {isOpen && (
          <div ref={optionsRef} className={optionsClasses}>
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search options..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}
            
            {/* Options List */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: `${maxHeight}px` }}
              role="listbox"
              aria-multiselectable={multiple}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  {searchQuery ? 'No options found' : 'No options available'}
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = selectedValues.includes(option.value);
                  const isFocused = focusedIndex === index;
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors',
                        'flex items-center gap-3',
                        'focus:outline-none',
                        !option.disabled && 'hover:bg-gray-50',
                        option.disabled && 'opacity-50 cursor-not-allowed',
                        isSelected && 'bg-primary-50 text-primary-700',
                        isFocused && !isSelected && 'bg-gray-50',
                        isFocused && isSelected && 'bg-primary-100'
                      )}
                      onClick={() => handleOptionSelect(option)}
                      disabled={option.disabled}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {/* Multiple selection checkbox */}
                      {multiple && (
                        <div className="flex-shrink-0">
                          <div
                            className={cn(
                              'w-4 h-4 border-2 rounded flex items-center justify-center',
                              isSelected
                                ? 'bg-primary-500 border-primary-500 text-white'
                                : 'border-gray-300'
                            )}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Option icon */}
                      {option.icon && (
                        <div className="flex-shrink-0 text-gray-500">
                          {option.icon}
                        </div>
                      )}
                      
                      {/* Option content */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {option.description}
                          </div>
                        )}
                      </div>
                      
                      {/* Single selection check */}
                      {!multiple && isSelected && (
                        <div className="flex-shrink-0 text-primary-500">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
export default Select;