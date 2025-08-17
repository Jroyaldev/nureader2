"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TouchSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onChangeStart?: () => void;
  onChangeEnd?: () => void;
  label?: string;
  showValue?: boolean;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'accent' | 'muted';
  disabled?: boolean;
  className?: string;
}

/**
 * TouchSlider - Enhanced slider component optimized for touch interactions
 * 
 * Features:
 * - Large touch targets for easy mobile interaction
 * - Haptic feedback on value changes
 * - Smooth gesture handling with proper touch events
 * - Visual feedback during dragging
 * - Keyboard accessibility support
 * - Support for both horizontal and vertical orientations
 */
const TouchSlider = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onChangeStart,
  onChangeEnd,
  label,
  showValue = false,
  orientation = 'horizontal',
  size = 'md',
  variant = 'default',
  disabled = false,
  className
}: TouchSliderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Calculate percentage for positioning
  const percentage = ((localValue - min) / (max - min)) * 100;

  // Size configurations
  const sizeConfig = {
    sm: {
      track: orientation === 'horizontal' ? 'h-1' : 'w-1',
      thumb: 'w-4 h-4',
      container: orientation === 'horizontal' ? 'h-8' : 'w-8'
    },
    md: {
      track: orientation === 'horizontal' ? 'h-2' : 'w-2',
      thumb: 'w-6 h-6',
      container: orientation === 'horizontal' ? 'h-10' : 'w-10'
    },
    lg: {
      track: orientation === 'horizontal' ? 'h-3' : 'w-3',
      thumb: 'w-8 h-8',
      container: orientation === 'horizontal' ? 'h-12' : 'w-12'
    }
  };

  // Variant colors
  const variantClasses = {
    default: {
      track: 'bg-gray-200 dark:bg-gray-700',
      progress: 'bg-blue-500',
      thumb: 'bg-blue-500 border-blue-500'
    },
    accent: {
      track: 'bg-gray-200 dark:bg-gray-700',
      progress: 'bg-purple-500',
      thumb: 'bg-purple-500 border-purple-500'
    },
    muted: {
      track: 'bg-gray-200 dark:bg-gray-700',
      progress: 'bg-gray-500',
      thumb: 'bg-gray-500 border-gray-500'
    }
  };

  // Calculate value from touch/mouse position
  const calculateValueFromPosition = useCallback((clientX: number, clientY: number) => {
    if (!sliderRef.current) return localValue;

    const rect = sliderRef.current.getBoundingClientRect();
    let percentage: number;

    if (orientation === 'horizontal') {
      percentage = (clientX - rect.left) / rect.width;
    } else {
      percentage = 1 - (clientY - rect.top) / rect.height; // Inverted for vertical
    }

    percentage = Math.max(0, Math.min(1, percentage));
    const rawValue = min + percentage * (max - min);
    
    // Round to nearest step
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.max(min, Math.min(max, steppedValue));
  }, [min, max, step, orientation, localValue]);

  // Haptic feedback helper
  const triggerHapticFeedback = useCallback(() => {
    if (disabled) return;
    
    if ('vibrate' in navigator) {
      navigator.vibrate([5]); // Light haptic feedback
    }
  }, [disabled]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDragging(true);
    onChangeStart?.();
    
    const touch = e.touches[0];
    const newValue = calculateValueFromPosition(touch.clientX, touch.clientY);
    setLocalValue(newValue);
    onChange(newValue);
    triggerHapticFeedback();
  }, [disabled, onChangeStart, calculateValueFromPosition, onChange, triggerHapticFeedback]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || disabled) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const newValue = calculateValueFromPosition(touch.clientX, touch.clientY);
    
    if (newValue !== localValue) {
      setLocalValue(newValue);
      onChange(newValue);
      triggerHapticFeedback();
    }
  }, [isDragging, disabled, calculateValueFromPosition, localValue, onChange, triggerHapticFeedback]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDragging(false);
    onChangeEnd?.();
  }, [disabled, onChangeEnd]);

  // Mouse event handlers for desktop support
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDragging(true);
    onChangeStart?.();
    
    const newValue = calculateValueFromPosition(e.clientX, e.clientY);
    setLocalValue(newValue);
    onChange(newValue);
  }, [disabled, onChangeStart, calculateValueFromPosition, onChange]);

  // Global mouse events for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (disabled) return;
      
      const newValue = calculateValueFromPosition(e.clientX, e.clientY);
      if (newValue !== localValue) {
        setLocalValue(newValue);
        onChange(newValue);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onChangeEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, disabled, calculateValueFromPosition, localValue, onChange, onChangeEnd]);

  // Keyboard support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    let newValue = localValue;
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        newValue = Math.min(max, localValue + step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        newValue = Math.max(min, localValue - step);
        break;
      case 'Home':
        e.preventDefault();
        newValue = min;
        break;
      case 'End':
        e.preventDefault();
        newValue = max;
        break;
      default:
        return;
    }

    setLocalValue(newValue);
    onChange(newValue);
    triggerHapticFeedback();
  }, [disabled, localValue, step, min, max, onChange, triggerHapticFeedback]);

  const currentConfig = sizeConfig[size];
  const currentVariant = variantClasses[variant];

  // Container classes based on orientation
  const containerClasses = cn(
    'relative flex items-center cursor-pointer touch-manipulation',
    orientation === 'horizontal' ? 'w-full' : 'h-full flex-col',
    currentConfig.container,
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    className
  );

  // Track classes
  const trackClasses = cn(
    'relative rounded-full transition-colors',
    orientation === 'horizontal' ? 'w-full' : 'h-full',
    currentConfig.track,
    currentVariant.track
  );

  // Progress bar classes
  const progressClasses = cn(
    'absolute rounded-full transition-all duration-200',
    currentVariant.progress,
    orientation === 'horizontal' 
      ? 'left-0 top-0 h-full' 
      : 'bottom-0 left-0 w-full'
  );

  // Thumb classes
  const thumbClasses = cn(
    'absolute rounded-full border-2 bg-white shadow-lg transition-all duration-200 transform -translate-x-1/2 -translate-y-1/2',
    currentConfig.thumb,
    currentVariant.thumb,
    isDragging ? 'scale-125 shadow-xl' : 'shadow-md',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/50'
  );

  // Calculate thumb position
  const thumbStyle = orientation === 'horizontal'
    ? { left: `${percentage}%`, top: '50%' }
    : { left: '50%', bottom: `${percentage}%`, transform: 'translateX(-50%) translateY(50%)' };

  // Progress bar style
  const progressStyle = orientation === 'horizontal'
    ? { width: `${percentage}%` }
    : { height: `${percentage}%` };

  return (
    <div className="space-y-2">
      {/* Label and value display */}
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted font-medium">{label}</span>}
          {showValue && <span className="text-foreground font-medium">{localValue}</span>}
        </div>
      )}
      
      {/* Slider container */}
      <div
        ref={sliderRef}
        className={containerClasses}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        role="slider"
        aria-valuenow={localValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        {/* Track */}
        <div className={trackClasses}>
          {/* Progress bar */}
          <div 
            className={progressClasses} 
            style={progressStyle}
          />
        </div>
        
        {/* Thumb */}
        <div
          ref={thumbRef}
          className={thumbClasses}
          style={thumbStyle}
        />
      </div>
    </div>
  );
};

export default TouchSlider;
export type { TouchSliderProps };