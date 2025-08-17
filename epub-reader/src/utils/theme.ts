/* Theme Utility Functions - For easy component migration */
/* Based on the successful TOC pattern: rgba(var(--variable), opacity) */

/**
 * Glass effect utility - standardized glass classes
 * Replaces hardcoded bg-white/90 dark:bg-black/90 patterns
 */
export const getGlassClasses = (opacity: 'low' | 'medium' | 'high' | 'solid' = 'medium') => {
  const opacityMap = {
    low: 'surface-glass-low',
    medium: 'surface-glass-medium', 
    high: 'surface-glass-high',
    solid: 'surface-glass-solid'
  };
  
  return opacityMap[opacity];
};

/**
 * Interactive element utility - for buttons and clickable elements
 * Provides consistent hover/active states that work in all themes
 */
export const getInteractiveClasses = (variant: 'button' | 'panel' | 'input' = 'button') => {
  const base = 'text-secondary hover:text-primary transition-colors duration-200';
  
  const variantMap = {
    button: `${base} hover:interactive-hover active:interactive-active`,
    panel: `${base} hover:bg-surface-secondary`,
    input: `${base} focus:text-primary focus:border-primary`
  };
  
  return variantMap[variant];
};

/**
 * Reader component patterns - specifically for reader UI elements
 * Based on the successful TableOfContents implementation
 */
export const getReaderClasses = () => ({
  // Floating panel (like TOC)
  floating: 'reader-floating no-top-glint rounded-2xl',
  
  // Panel content
  content: 'reader-panel-content',
  
  // Interactive buttons in reader
  button: 'reader-btn',
  
  // Mobile toolbar
  mobileToolbar: 'reader-mobile-toolbar',
  
  // Search input
  searchInput: 'reader-search-input',
  
  // Modal glass (for settings panels)
  modalGlass: 'reader-modal-glass rounded-2xl'
});

/**
 * Migration helper - converts hardcoded patterns to semantic classes
 * Use this to systematically replace problematic patterns
 */
export const migrationMap = {
  // Replace these hardcoded patterns:
  'bg-white/90 dark:bg-black/90': 'surface-glass-medium',
  'bg-white/80 dark:bg-black/80': 'surface-glass-low', 
  'bg-white/95 dark:bg-black/95': 'surface-glass-high',
  'text-gray-600 dark:text-gray-400': 'text-secondary',
  'text-gray-900 dark:text-white': 'text-primary',
  'text-gray-500 dark:text-gray-500': 'text-tertiary',
  'border-black/10 dark:border-white/20': 'border-primary/10',
  'border-black/5 dark:border-white/5': 'border-primary/5',
  
  // With these semantic alternatives:
  'backdrop-blur-xl': 'surface-glass-medium', // Include backdrop filter
  'backdrop-blur-lg': 'surface-glass-low',
  'backdrop-blur-2xl': 'surface-glass-high'
};

/**
 * Component pattern utilities for common reader UI patterns
 */
export const componentPatterns = {
  // Panel patterns (based on TOC success)
  panel: {
    floating: 'fixed z-50 transition-all duration-300',
    glass: 'surface-glass-high rounded-2xl flex flex-col',
    header: 'panel-header px-6 py-5 shrink-0',
    content: 'flex-1 overflow-y-auto px-4 py-4',
    footer: 'border-t border-primary/5 px-6 py-3'
  },
  
  // Button patterns
  button: {
    reader: 'reader-btn transition-all duration-200',
    mobile: 'mobile-btn touch-target',
    interactive: 'text-secondary hover:text-primary hover:interactive-hover'
  },
  
  // Modal patterns
  modal: {
    backdrop: 'fixed inset-0 bg-black/40 backdrop-blur-md',
    glass: 'reader-modal-glass',
    bottomSheet: 'bottom-sheet-glass rounded-t-2xl'
  },
  
  // Input patterns
  input: {
    search: 'reader-search-input w-full px-4 py-3 rounded-xl',
    slider: 'reader-slider w-full'
  }
};

/**
 * Theme-aware className builder
 * Combines semantic classes with custom classes safely
 */
export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Responsive glass utility for mobile optimization
 */
export const getResponsiveGlass = (desktop: 'low' | 'medium' | 'high' = 'medium') => {
  const desktopClass = getGlassClasses(desktop);
  // Mobile uses less intensive blur for performance
  return `${desktopClass} md:backdrop-blur-2xl backdrop-blur-lg`;
};

/**
 * Validation helper - check if a component uses hardcoded colors
 */
export const hasHardcodedColors = (className: string): boolean => {
  const hardcodedPatterns = [
    /bg-white\/\d+/,
    /dark:bg-black\/\d+/,
    /text-gray-\d+/,
    /dark:text-gray-\d+/,
    /border-black\/\d+/,
    /dark:border-white\/\d+/
  ];
  
  return hardcodedPatterns.some(pattern => pattern.test(className));
};

/**
 * Component health check - validates theme compatibility
 */
export const validateThemeCompatibility = (componentName: string, className: string) => {
  if (hasHardcodedColors(className)) {
    console.warn(`⚠️  ${componentName} uses hardcoded colors: ${className}`);
    console.log(`💡 Consider using semantic classes from theme utils`);
    return false;
  }
  return true;
};