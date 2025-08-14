/**
 * Utility functions for the design system
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names with proper precedence handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simple throttle function
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

/**
 * Create a variant class name generator
 */
export function createVariants<T extends Record<string, Record<string, string>>>(
  variants: T
) {
  return function getVariantClasses<K extends keyof T>(
    variant: K,
    value: keyof T[K]
  ): string {
    return variants[variant][value] || "";
  };
}

/**
 * Generate responsive class names
 */
export function responsive(
  classes: {
    base?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    "2xl"?: string;
  }
): string {
  const classNames: string[] = [];

  if (classes.base) classNames.push(classes.base);
  if (classes.sm) classNames.push(`sm:${classes.sm}`);
  if (classes.md) classNames.push(`md:${classes.md}`);
  if (classes.lg) classNames.push(`lg:${classes.lg}`);
  if (classes.xl) classNames.push(`xl:${classes.xl}`);
  if (classes["2xl"]) classNames.push(`2xl:${classes["2xl"]}`);

  return classNames.join(" ");
}

/**
 * Generate state-based class names
 */
export function states(
  classes: {
    base?: string;
    hover?: string;
    focus?: string;
    active?: string;
    disabled?: string;
  }
): string {
  const classNames: string[] = [];

  if (classes.base) classNames.push(classes.base);
  if (classes.hover) classNames.push(`hover:${classes.hover}`);
  if (classes.focus) classNames.push(`focus:${classes.focus}`);
  if (classes.active) classNames.push(`active:${classes.active}`);
  if (classes.disabled) classNames.push(`disabled:${classes.disabled}`);

  return classNames.join(" ");
}

/**
 * Generate animation class names with reduced motion support
 */
export function animation(
  animationClass: string,
  reducedMotionFallback?: string
): string {
  const classes = [animationClass];
  
  if (reducedMotionFallback) {
    classes.push(`motion-reduce:${reducedMotionFallback}`);
  } else {
    classes.push("motion-reduce:animate-none");
  }

  return classes.join(" ");
}

/**
 * Generate focus ring classes
 */
export function focusRing(
  color: "primary" | "secondary" | "success" | "warning" | "error" = "primary"
): string {
  const colorMap = {
    primary: "focus-visible:ring-primary",
    secondary: "focus-visible:ring-secondary",
    success: "focus-visible:ring-success-500",
    warning: "focus-visible:ring-warning-500",
    error: "focus-visible:ring-error-500",
  };

  return cn(
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-offset-2",
    "focus-visible:ring-offset-background",
    colorMap[color]
  );
}

/**
 * Generate glass effect classes
 */
export function glassEffect(strength: "light" | "medium" | "strong" = "medium"): string {
  const strengthMap = {
    light: "backdrop-blur-sm bg-background/70",
    medium: "backdrop-blur-md bg-background/80",
    strong: "backdrop-blur-lg bg-background/90",
  };

  return cn(
    strengthMap[strength],
    "border border-border/20",
    "shadow-lg"
  );
}

/**
 * Generate card classes
 */
export function card(
  variant: "default" | "elevated" | "outlined" | "ghost" = "default",
  interactive: boolean = false
): string {
  const variantMap = {
    default: "bg-card border border-border",
    elevated: "bg-card shadow-md",
    outlined: "bg-transparent border-2 border-border",
    ghost: "bg-transparent",
  };

  const baseClasses = cn(
    "rounded-lg",
    variantMap[variant],
    interactive && "transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
  );

  return baseClasses;
}

/**
 * Generate button classes
 */
export function button(
  variant: "primary" | "secondary" | "outline" | "ghost" | "destructive" = "primary",
  size: "xs" | "sm" | "md" | "lg" | "xl" = "md",
  fullWidth: boolean = false
): string {
  const variantMap = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
    ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  };

  const sizeMap = {
    xs: "h-7 px-2 text-xs",
    sm: "h-8 px-3 text-sm",
    md: "h-9 px-4 text-sm",
    lg: "h-10 px-6 text-base",
    xl: "h-12 px-8 text-lg",
  };

  return cn(
    "inline-flex items-center justify-center gap-2",
    "rounded-md font-medium",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    variantMap[variant],
    sizeMap[size],
    fullWidth && "w-full"
  );
}

/**
 * Generate input classes
 */
export function input(
  variant: "default" | "filled" | "outlined" = "default",
  size: "sm" | "md" | "lg" = "md",
  state: "default" | "error" | "success" = "default"
): string {
  const variantMap = {
    default: "border border-border bg-background",
    filled: "border-0 bg-muted",
    outlined: "border-2 border-border bg-transparent",
  };

  const sizeMap = {
    sm: "h-8 px-3 text-sm",
    md: "h-9 px-3 text-sm",
    lg: "h-10 px-4 text-base",
  };

  const stateMap = {
    default: "focus:border-ring focus:ring-2 focus:ring-ring/20",
    error: "border-error focus:border-error focus:ring-2 focus:ring-error/20",
    success: "border-success-500 focus:border-success-500 focus:ring-2 focus:ring-success-500/20",
  };

  return cn(
    "flex w-full rounded-md",
    "text-foreground placeholder:text-muted-foreground",
    "transition-colors duration-150",
    "focus:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variantMap[variant],
    sizeMap[size],
    stateMap[state]
  );
}

/**
 * Generate typography classes
 */
export function typography(
  variant: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body" | "caption" | "overline"
): string {
  const variantMap = {
    h1: "text-4xl font-bold tracking-tight lg:text-5xl",
    h2: "text-3xl font-semibold tracking-tight",
    h3: "text-2xl font-semibold tracking-tight",
    h4: "text-xl font-semibold tracking-tight",
    h5: "text-lg font-medium",
    h6: "text-base font-medium",
    body: "text-base leading-relaxed",
    caption: "text-sm text-muted-foreground",
    overline: "text-xs font-medium uppercase tracking-wider text-muted-foreground",
  };

  return variantMap[variant];
}

/**
 * Generate spacing classes
 */
export function spacing(
  direction: "all" | "x" | "y" | "t" | "r" | "b" | "l",
  size: keyof typeof import("./design-system").spacing,
  type: "margin" | "padding" = "padding"
): string {
  const prefix = type === "margin" ? "m" : "p";
  const directionMap = {
    all: "",
    x: "x",
    y: "y",
    t: "t",
    r: "r",
    b: "b",
    l: "l",
  };

  return `${prefix}${directionMap[direction]}-${size}`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format date
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(d);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if device prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= 768 && window.innerWidth < 1024;
}

/**
 * Check if device is desktop
 */
export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= 1024;
}