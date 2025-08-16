/**
 * SearchInput Component
 * 
 * An advanced search input component with clear button, suggestions,
 * and keyboard navigation support.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../../lib/utils';

export interface SearchSuggestion {
  id: string;
  text: string;
  category?: string;
  icon?: React.ReactNode;
}

export interface SearchInputProps {
  value?: string;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled';
  showClearButton?: boolean;
  maxSuggestions?: number;
  debounceMs?: number;
  className?: string;
  inputClassName?: string;
  suggestionsClassName?: string;
  
  // Event handlers
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  
  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({
    value = '',
    placeholder = 'Search...',
    suggestions = [],
    loading = false,
    disabled = false,
    size = 'md',
    variant = 'default',
    showClearButton = true,
    maxSuggestions = 5,
    debounceMs = 300,
    className,
    inputClassName,
    suggestionsClassName,
    onChange,
    onSearch,
    onSuggestionSelect,
    onFocus,
    onBlur,
    onClear,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout>();
    
    // Combine refs
    const combinedRef = useCallback((node: HTMLInputElement) => {
      inputRef.current = node;
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
    
    // Debounced search
    useEffect(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(() => {
        if (onSearch && internalValue.trim()) {
          onSearch(internalValue);
        }
      }, debounceMs);
      
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, [internalValue, onSearch, debounceMs]);
    
    // Filter and limit suggestions
    const filteredSuggestions = suggestions
      .filter(suggestion => 
        suggestion.text.toLowerCase().includes(internalValue.toLowerCase())
      )
      .slice(0, maxSuggestions);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);
      setSelectedSuggestionIndex(-1);
      setShowSuggestions(true);
      onChange?.(newValue);
    };
    
    const handleInputFocus = () => {
      setIsFocused(true);
      setShowSuggestions(filteredSuggestions.length > 0);
      onFocus?.();
    };
    
    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Delay hiding suggestions to allow for suggestion clicks
      setTimeout(() => {
        setIsFocused(false);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }, 150);
      onBlur?.();
    };
    
    const handleClear = () => {
      setInternalValue('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      onChange?.('');
      onClear?.();
      inputRef.current?.focus();
    };
    
    const handleSuggestionClick = (suggestion: SearchSuggestion) => {
      setInternalValue(suggestion.text);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      onChange?.(suggestion.text);
      onSuggestionSelect?.(suggestion);
      inputRef.current?.focus();
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || filteredSuggestions.length === 0) {
        if (e.key === 'Enter' && onSearch) {
          onSearch(internalValue);
        }
        return;
      }
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          );
          break;
          
        case 'Enter':
          e.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            handleSuggestionClick(filteredSuggestions[selectedSuggestionIndex]);
          } else if (onSearch) {
            onSearch(internalValue);
          }
          break;
          
        case 'Escape':
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };
    
    // Size variants
    const sizeClasses = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-4 text-base',
      lg: 'h-13 px-5 text-lg',
    };
    
    // Variant classes
    const variantClasses = {
      default: 'bg-white/80 backdrop-blur-md border-white/20 focus:border-primary-500 shadow-lg',
      filled: 'bg-white/60 backdrop-blur-md border-white/10 focus:bg-white/80 focus:border-primary-500 shadow-lg',
    };
    
    const baseInputClasses = cn(
      // Base styles
      'w-full rounded-lg border transition-all duration-200 font-inter touch-manipulation',
      'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50/50 disabled:backdrop-blur-md',
      
      // Size
      sizeClasses[size],
      
      // Variant
      variantClasses[variant],
      
      // Focus state
      isFocused && 'ring-2 ring-primary-500/20',
      
      // Padding adjustment for icons
      'pl-10', // Space for search icon
      showClearButton && internalValue && 'pr-10', // Space for clear button
      
      inputClassName
    );
    
    const containerClasses = cn(
      'relative w-full',
      className
    );
    
    const suggestionsClasses = cn(
      'absolute top-full left-0 right-0 z-50 mt-1',
      'bg-white/90 backdrop-blur-md border border-white/20 rounded-lg shadow-xl',
      'max-h-60 overflow-y-auto font-inter',
      'animate-in fade-in-0 zoom-in-95 duration-100',
      suggestionsClassName
    );
    
    return (
      <div className={containerClasses}>
        <div className="relative">
          {/* Search Icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          
          {/* Input */}
          <input
            ref={combinedRef}
            type="text"
            value={internalValue}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
            role="combobox"
            aria-autocomplete="list"
            {...props}
          />
          
          {/* Loading Spinner */}
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-500" />
            </div>
          )}
          
          {/* Clear Button */}
          {showClearButton && internalValue && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-600 transition-colors touch-manipulation"
              aria-label="Clear search"
            >
              <svg
                className="h-4 w-4"
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
          )}
        </div>
        
        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div ref={suggestionsRef} className={suggestionsClasses} role="listbox">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                className={cn(
                  'w-full px-4 py-3 text-left active:bg-white/60 transition-colors touch-manipulation',
                  'flex items-center gap-3 border-b border-white/10 last:border-b-0',
                  'focus:outline-none focus:bg-white/60',
                  selectedSuggestionIndex === index && 'bg-primary-50/80 text-primary-700'
                )}
                onClick={() => handleSuggestionClick(suggestion)}
                role="option"
                aria-selected={selectedSuggestionIndex === index}
              >
                {suggestion.icon && (
                  <div className="flex-shrink-0 text-gray-400">
                    {suggestion.icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.text}
                  </div>
                  {suggestion.category && (
                    <div className="text-xs text-gray-500 truncate">
                      {suggestion.category}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export { SearchInput };
export default SearchInput;