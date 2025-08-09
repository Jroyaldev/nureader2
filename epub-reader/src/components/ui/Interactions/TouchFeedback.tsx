/**
 * Touch Feedback Components
 * 
 * Components and utilities for providing touch-friendly hover states and active feedback.
 * Includes ripple effects, touch highlights, and haptic feedback integration.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ===== RIPPLE EFFECT =====

export interface RippleProps {
  /** Color of the ripple effect */
  color?: string;
  /** Duration of the ripple animation in milliseconds */
  duration?: number;
  /** Opacity of the ripple effect */
  opacity?: number;
}

interface RippleState {
  x: number;
  y: number;
  size: number;
  id: number;
}

const Ripple: React.FC<RippleProps & { ripples: RippleState[] }> = ({
  ripples,
  color = 'currentColor',
  duration = 600,
  opacity = 0.3,
}) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute rounded-full animate-ping"
          style={{
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            opacity,
            animationDuration: `${duration}ms`,
          }}
        />
      ))}
    </div>
  );
};

// ===== TOUCH BUTTON =====

export interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Enable ripple effect */
  enableRipple?: boolean;
  /** Ripple color */
  rippleColor?: string;
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Haptic feedback type */
  hapticType?: 'light' | 'medium' | 'heavy';
  /** Touch highlight color */
  highlightColor?: string;
  /** Button variant */
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'outline';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Full width button */
  fullWidth?: boolean;
  children: React.ReactNode;
}

const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ 
    className,
    enableRipple = true,
    rippleColor,
    enableHaptics = true,
    hapticType = 'light',
    highlightColor,
    variant = 'default',
    size = 'md',
    fullWidth = false,
    onClick,
    onTouchStart,
    children,
    ...props 
  }, ref) => {
    const [ripples, setRipples] = useState<RippleState[]>([]);
    const [isPressed, setIsPressed] = useState(false);
    const rippleIdRef = useRef(0);

    // Trigger haptic feedback
    const triggerHaptic = useCallback(() => {
      if (!enableHaptics) return;
      
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const patterns = {
          light: [5],
          medium: [10],
          heavy: [15],
        };
        navigator.vibrate(patterns[hapticType]);
      }
    }, [enableHaptics, hapticType]);

    // Create ripple effect
    const createRipple = useCallback((event: React.MouseEvent | React.TouchEvent) => {
      if (!enableRipple) return;

      const button = event.currentTarget as HTMLButtonElement;
      const rect = button.getBoundingClientRect();
      
      let clientX: number, clientY: number;
      
      if ('touches' in event) {
        const touch = event.touches[0] || event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }
      
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;
      
      const newRipple: RippleState = {
        x,
        y,
        size,
        id: rippleIdRef.current++,
      };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);
    }, [enableRipple]);

    // Handle touch start
    const handleTouchStart = useCallback((event: React.TouchEvent<HTMLButtonElement>) => {
      setIsPressed(true);
      triggerHaptic();
      createRipple(event);
      onTouchStart?.(event);
    }, [triggerHaptic, createRipple, onTouchStart]);

    // Handle touch end
    const handleTouchEnd = useCallback(() => {
      setIsPressed(false);
    }, []);

    // Handle mouse down
    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      setIsPressed(true);
      createRipple(event);
    }, [createRipple]);

    // Handle mouse up/leave
    const handleMouseUp = useCallback(() => {
      setIsPressed(false);
    }, []);

    // Handle click
    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (!('touches' in event)) {
        triggerHaptic();
      }
      onClick?.(event);
    }, [triggerHaptic, onClick]);

    // Get variant classes
    const getVariantClasses = () => {
      const variants = {
        default: 'bg-background text-foreground border border-border hover:bg-muted/50',
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-foreground hover:bg-muted/50',
        outline: 'border border-border text-foreground hover:bg-muted/50',
      };
      return variants[variant];
    };

    // Get size classes
    const getSizeClasses = () => {
      const sizes = {
        sm: 'px-3 py-1.5 text-sm min-h-[36px]',
        md: 'px-4 py-2 text-sm min-h-[44px]',
        lg: 'px-6 py-3 text-base min-h-[52px]',
      };
      return sizes[size];
    };

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center gap-2',
          'font-medium rounded-lg transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          'touch-manipulation select-none overflow-hidden',
          
          // Variant styles
          getVariantClasses(),
          
          // Size styles
          getSizeClasses(),
          
          // Full width
          fullWidth && 'w-full',
          
          // Pressed state
          isPressed && 'scale-95',
          
          // Custom highlight color
          highlightColor && `active:bg-[${highlightColor}]`,
          
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        {...props}
      >
        {children}
        
        {/* Ripple effect */}
        {enableRipple && (
          <Ripple 
            ripples={ripples} 
            color={rippleColor}
          />
        )}
      </button>
    );
  }
);

TouchButton.displayName = 'TouchButton';

// ===== TOUCH CARD =====

export interface TouchCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Enable press feedback */
  enablePress?: boolean;
  /** Enable ripple effect */
  enableRipple?: boolean;
  /** Ripple color */
  rippleColor?: string;
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Haptic feedback type */
  hapticType?: 'light' | 'medium' | 'heavy';
  /** Card variant */
  variant?: 'default' | 'elevated' | 'outlined';
  /** Hover effect */
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'none';
  children: React.ReactNode;
}

const TouchCard = React.forwardRef<HTMLDivElement, TouchCardProps>(
  ({ 
    className,
    enablePress = true,
    enableRipple = false,
    rippleColor,
    enableHaptics = false,
    hapticType = 'light',
    variant = 'default',
    hoverEffect = 'lift',
    onClick,
    onTouchStart,
    children,
    ...props 
  }, ref) => {
    const [ripples, setRipples] = useState<RippleState[]>([]);
    const [isPressed, setIsPressed] = useState(false);
    const rippleIdRef = useRef(0);

    // Trigger haptic feedback
    const triggerHaptic = useCallback(() => {
      if (!enableHaptics) return;
      
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const patterns = {
          light: [5],
          medium: [10],
          heavy: [15],
        };
        navigator.vibrate(patterns[hapticType]);
      }
    }, [enableHaptics, hapticType]);

    // Create ripple effect
    const createRipple = useCallback((event: React.MouseEvent | React.TouchEvent) => {
      if (!enableRipple) return;

      const card = event.currentTarget as HTMLDivElement;
      const rect = card.getBoundingClientRect();
      
      let clientX: number, clientY: number;
      
      if ('touches' in event) {
        const touch = event.touches[0] || event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }
      
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 1.5;
      
      const newRipple: RippleState = {
        x,
        y,
        size,
        id: rippleIdRef.current++,
      };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);
    }, [enableRipple]);

    // Handle touch start
    const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
      if (enablePress) setIsPressed(true);
      if (enableHaptics) triggerHaptic();
      if (enableRipple) createRipple(event);
      onTouchStart?.(event);
    }, [enablePress, enableHaptics, enableRipple, triggerHaptic, createRipple, onTouchStart]);

    // Handle touch end
    const handleTouchEnd = useCallback(() => {
      setIsPressed(false);
    }, []);

    // Handle mouse down
    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
      if (enablePress) setIsPressed(true);
      if (enableRipple) createRipple(event);
    }, [enablePress, enableRipple, createRipple]);

    // Handle mouse up/leave
    const handleMouseUp = useCallback(() => {
      setIsPressed(false);
    }, []);

    // Get variant classes
    const getVariantClasses = () => {
      const variants = {
        default: 'bg-card border border-border',
        elevated: 'bg-card shadow-md',
        outlined: 'bg-transparent border-2 border-border',
      };
      return variants[variant];
    };

    // Get hover effect classes
    const getHoverEffectClasses = () => {
      const effects = {
        lift: 'hover:shadow-lg hover:-translate-y-1',
        glow: 'hover:shadow-xl hover:shadow-primary/20',
        scale: 'hover:scale-105',
        none: '',
      };
      return effects[hoverEffect];
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative rounded-lg transition-all duration-200',
          'cursor-pointer touch-manipulation select-none overflow-hidden',
          
          // Variant styles
          getVariantClasses(),
          
          // Hover effects
          getHoverEffectClasses(),
          
          // Pressed state
          enablePress && isPressed && 'scale-95',
          
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={onClick}
        {...props}
      >
        {children}
        
        {/* Ripple effect */}
        {enableRipple && (
          <Ripple 
            ripples={ripples} 
            color={rippleColor}
          />
        )}
      </div>
    );
  }
);

TouchCard.displayName = 'TouchCard';

export { TouchButton, TouchCard, Ripple };