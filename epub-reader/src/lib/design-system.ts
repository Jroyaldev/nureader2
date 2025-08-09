/**
 * Design System Configuration
 * 
 * TypeScript definitions and utilities for the design system.
 * This file provides type-safe access to design tokens and utilities.
 */

// ===== COLOR SYSTEM =====

export const colors = {
  primary: {
    50: 'rgb(240 249 255)',
    100: 'rgb(224 242 254)',
    200: 'rgb(186 230 253)',
    300: 'rgb(125 211 252)',
    400: 'rgb(56 189 248)',
    500: 'rgb(14 165 233)',
    600: 'rgb(2 132 199)',
    700: 'rgb(3 105 161)',
    800: 'rgb(7 89 133)',
    900: 'rgb(12 74 110)',
    950: 'rgb(8 47 73)',
  },
  secondary: {
    50: 'rgb(248 250 252)',
    100: 'rgb(241 245 249)',
    200: 'rgb(226 232 240)',
    300: 'rgb(203 213 225)',
    400: 'rgb(148 163 184)',
    500: 'rgb(100 116 139)',
    600: 'rgb(71 85 105)',
    700: 'rgb(51 65 85)',
    800: 'rgb(30 41 59)',
    900: 'rgb(15 23 42)',
    950: 'rgb(2 6 23)',
  },
  gray: {
    50: 'rgb(249 250 251)',
    100: 'rgb(243 244 246)',
    200: 'rgb(229 231 235)',
    300: 'rgb(209 213 219)',
    400: 'rgb(156 163 175)',
    500: 'rgb(107 114 128)',
    600: 'rgb(75 85 99)',
    700: 'rgb(55 65 81)',
    800: 'rgb(31 41 55)',
    900: 'rgb(17 24 39)',
    950: 'rgb(3 7 18)',
  },
  success: {
    50: 'rgb(240 253 244)',
    100: 'rgb(220 252 231)',
    200: 'rgb(187 247 208)',
    300: 'rgb(134 239 172)',
    400: 'rgb(74 222 128)',
    500: 'rgb(34 197 94)',
    600: 'rgb(22 163 74)',
    700: 'rgb(21 128 61)',
    800: 'rgb(22 101 52)',
    900: 'rgb(20 83 45)',
    950: 'rgb(5 46 22)',
  },
  warning: {
    50: 'rgb(255 251 235)',
    100: 'rgb(254 243 199)',
    200: 'rgb(253 230 138)',
    300: 'rgb(252 211 77)',
    400: 'rgb(251 191 36)',
    500: 'rgb(245 158 11)',
    600: 'rgb(217 119 6)',
    700: 'rgb(180 83 9)',
    800: 'rgb(146 64 14)',
    900: 'rgb(120 53 15)',
    950: 'rgb(69 26 3)',
  },
  error: {
    50: 'rgb(254 242 242)',
    100: 'rgb(254 226 226)',
    200: 'rgb(254 202 202)',
    300: 'rgb(252 165 165)',
    400: 'rgb(248 113 113)',
    500: 'rgb(239 68 68)',
    600: 'rgb(220 38 38)',
    700: 'rgb(185 28 28)',
    800: 'rgb(153 27 27)',
    900: 'rgb(127 29 29)',
    950: 'rgb(69 10 10)',
  },
  info: {
    50: 'rgb(239 246 255)',
    100: 'rgb(219 234 254)',
    200: 'rgb(191 219 254)',
    300: 'rgb(147 197 253)',
    400: 'rgb(96 165 250)',
    500: 'rgb(59 130 246)',
    600: 'rgb(37 99 235)',
    700: 'rgb(29 78 216)',
    800: 'rgb(30 64 175)',
    900: 'rgb(30 58 138)',
    950: 'rgb(23 37 84)',
  },
} as const;

// ===== TYPOGRAPHY SYSTEM =====

export const typography = {
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSize: {
    xs: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
    sm: 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
    base: 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
    lg: 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
    xl: 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
    '2xl': 'clamp(1.5rem, 1.3rem + 1vw, 2rem)',
    '3xl': 'clamp(1.875rem, 1.6rem + 1.375vw, 2.5rem)',
    '4xl': 'clamp(2.25rem, 1.9rem + 1.75vw, 3rem)',
    '5xl': 'clamp(3rem, 2.5rem + 2.5vw, 4rem)',
    '6xl': 'clamp(3.75rem, 3rem + 3.75vw, 5rem)',
  },
  fontWeight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ===== SPACING SYSTEM =====

export const spacing = {
  px: '1px',
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',
} as const;

// ===== BORDER RADIUS SYSTEM =====

export const borderRadius = {
  none: '0px',
  sm: '4px',
  base: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

// ===== SHADOW SYSTEM =====

export const boxShadow = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  '2xl': '0 50px 100px -20px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// ===== ANIMATION SYSTEM =====

export const animation = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// ===== BREAKPOINTS =====

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ===== Z-INDEX SCALE =====

export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  auto: 'auto',
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

// ===== TYPE DEFINITIONS =====

export type ColorScale = typeof colors.primary;
export type ColorKey = keyof typeof colors;
export type ColorShade = keyof ColorScale;

export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type LineHeight = keyof typeof typography.lineHeight;
export type LetterSpacing = keyof typeof typography.letterSpacing;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type BoxShadowKey = keyof typeof boxShadow;

export type AnimationDuration = keyof typeof animation.duration;
export type AnimationEasing = keyof typeof animation.easing;

export type BreakpointKey = keyof typeof breakpoints;
export type ZIndexKey = keyof typeof zIndex;

// ===== UTILITY FUNCTIONS =====

/**
 * Get a color value from the design system
 */
export function getColor(color: ColorKey, shade: ColorShade = 500): string {
  return colors[color][shade];
}

/**
 * Get a spacing value from the design system
 */
export function getSpacing(key: SpacingKey): string {
  return spacing[key];
}

/**
 * Get a border radius value from the design system
 */
export function getBorderRadius(key: BorderRadiusKey): string {
  return borderRadius[key];
}

/**
 * Get a box shadow value from the design system
 */
export function getBoxShadow(key: BoxShadowKey): string {
  return boxShadow[key];
}

/**
 * Get a font size value from the design system
 */
export function getFontSize(key: FontSize): string {
  return typography.fontSize[key];
}

/**
 * Get an animation duration value from the design system
 */
export function getAnimationDuration(key: AnimationDuration): string {
  return animation.duration[key];
}

/**
 * Get an animation easing value from the design system
 */
export function getAnimationEasing(key: AnimationEasing): string {
  return animation.easing[key];
}

/**
 * Get a breakpoint value from the design system
 */
export function getBreakpoint(key: BreakpointKey): string {
  return breakpoints[key];
}

/**
 * Get a z-index value from the design system
 */
export function getZIndex(key: ZIndexKey): number | string {
  return zIndex[key];
}

// ===== COMPONENT VARIANTS =====

export const buttonVariants = {
  variant: {
    primary: 'btn-base btn-primary',
    secondary: 'btn-base btn-secondary',
    outline: 'btn-base btn-outline',
    ghost: 'btn-base btn-ghost',
    destructive: 'btn-base btn-destructive',
  },
  size: {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
    xl: 'btn-xl',
  },
} as const;

export const inputVariants = {
  variant: {
    default: 'input-base',
  },
  size: {
    sm: 'text-sm p-2',
    md: 'text-base p-3',
    lg: 'text-lg p-4',
  },
} as const;

// ===== THEME CONFIGURATION =====

export interface ThemeConfig {
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  boxShadow: typeof boxShadow;
  animation: typeof animation;
  breakpoints: typeof breakpoints;
  zIndex: typeof zIndex;
}

export const theme: ThemeConfig = {
  colors,
  typography,
  spacing,
  borderRadius,
  boxShadow,
  animation,
  breakpoints,
  zIndex,
};

// ===== CSS CUSTOM PROPERTY HELPERS =====

/**
 * Generate CSS custom properties from design tokens
 */
export function generateCSSCustomProperties(): Record<string, string> {
  const properties: Record<string, string> = {};

  // Colors
  Object.entries(colors).forEach(([colorName, colorScale]) => {
    Object.entries(colorScale).forEach(([shade, value]) => {
      properties[`--color-${colorName}-${shade}`] = value.replace('rgb(', '').replace(')', '');
    });
  });

  // Spacing
  Object.entries(spacing).forEach(([key, value]) => {
    properties[`--space-${key}`] = value;
  });

  // Border radius
  Object.entries(borderRadius).forEach(([key, value]) => {
    properties[`--radius-${key}`] = value;
  });

  // Shadows
  Object.entries(boxShadow).forEach(([key, value]) => {
    properties[`--shadow-${key}`] = value;
  });

  // Typography
  Object.entries(typography.fontSize).forEach(([key, value]) => {
    properties[`--text-${key}`] = value;
  });

  // Animation
  Object.entries(animation.duration).forEach(([key, value]) => {
    properties[`--duration-${key}`] = value;
  });

  Object.entries(animation.easing).forEach(([key, value]) => {
    properties[`--ease-${key}`] = value;
  });

  return properties;
}

export default theme;