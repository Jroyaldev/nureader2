import React from 'react';
import { cn } from '@/utils';

/**
 * Typography variants
 */
export type TypographyVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'h5' 
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'overline';

/**
 * Typography component props
 */
export interface TypographyProps {
  /**
   * The variant to use
   */
  variant?: TypographyVariant;
  /**
   * The component to render
   */
  as?: keyof JSX.IntrinsicElements;
  /**
   * Text content
   */
  children: React.ReactNode;
  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right' | 'justify';
  /**
   * Text color
   */
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'inherit';
  /**
   * Font weight
   */
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  /**
   * Whether to add margin bottom
   */
  gutterBottom?: boolean;
  /**
   * Whether to truncate text
   */
  truncate?: boolean;
  /**
   * Number of lines to clamp
   */
  clamp?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

const variantMapping = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  subtitle1: 'h6',
  subtitle2: 'h6',
  body1: 'p',
  body2: 'p',
  caption: 'span',
  overline: 'span',
} as const;

const variantClasses = {
  h1: 'text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight',
  h2: 'text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight',
  h3: 'text-2xl sm:text-3xl lg:text-4xl font-semibold',
  h4: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
  h5: 'text-lg sm:text-xl lg:text-2xl font-medium',
  h6: 'text-base sm:text-lg lg:text-xl font-medium',
  subtitle1: 'text-lg font-medium',
  subtitle2: 'text-base font-medium',
  body1: 'text-base',
  body2: 'text-sm',
  caption: 'text-xs',
  overline: 'text-xs uppercase tracking-wider font-medium',
};

const colorClasses = {
  primary: 'text-gray-900 dark:text-white',
  secondary: 'text-gray-600 dark:text-gray-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  success: 'text-green-600 dark:text-green-400',
  inherit: '',
};

const weightClasses = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

/**
 * Typography component for consistent text styling
 * 
 * @example
 * ```tsx
 * <Typography variant="h1">Heading 1</Typography>
 * <Typography variant="body1" color="secondary">Body text</Typography>
 * <Typography variant="caption" truncate>Long caption text...</Typography>
 * ```
 */
export const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  as,
  children,
  align = 'left',
  color = 'primary',
  weight,
  gutterBottom = false,
  truncate = false,
  clamp,
  className,
}) => {
  const Component = as || variantMapping[variant] || 'span';

  return (
    <Component
      className={cn(
        variantClasses[variant],
        colorClasses[color],
        alignClasses[align],
        weight && weightClasses[weight],
        gutterBottom && 'mb-4',
        truncate && 'truncate',
        clamp && `line-clamp-${clamp}`,
        className
      )}
    >
      {children}
    </Component>
  );
};

Typography.displayName = 'Typography';

/**
 * Text component for inline text styling
 */
export interface TextProps {
  children: React.ReactNode;
  /**
   * Font size
   */
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  /**
   * Font weight
   */
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  /**
   * Text color
   */
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'muted' | 'inherit';
  /**
   * Whether text is italic
   */
  italic?: boolean;
  /**
   * Whether text is underlined
   */
  underline?: boolean;
  /**
   * Whether text is strikethrough
   */
  strikethrough?: boolean;
  /**
   * Text transform
   */
  transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  /**
   * Additional CSS classes
   */
  className?: string;
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
};

const textColorClasses = {
  primary: 'text-gray-900 dark:text-white',
  secondary: 'text-gray-600 dark:text-gray-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  success: 'text-green-600 dark:text-green-400',
  muted: 'text-gray-500 dark:text-gray-500',
  inherit: '',
};

export const Text: React.FC<TextProps> = ({
  children,
  size = 'base',
  weight = 'normal',
  color = 'inherit',
  italic = false,
  underline = false,
  strikethrough = false,
  transform = 'none',
  className,
}) => {
  return (
    <span
      className={cn(
        sizeClasses[size],
        weightClasses[weight],
        textColorClasses[color],
        italic && 'italic',
        underline && 'underline',
        strikethrough && 'line-through',
        transform !== 'none' && transform,
        className
      )}
    >
      {children}
    </span>
  );
};

Text.displayName = 'Text';

/**
 * Heading component for section headings
 */
export interface HeadingProps {
  children: React.ReactNode;
  /**
   * Heading level
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Visual size (independent of semantic level)
   */
  size?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right';
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Heading: React.FC<HeadingProps> = ({
  children,
  level = 2,
  size,
  align = 'left',
  className,
}) => {
  const Component = `h${level}` as keyof JSX.IntrinsicElements;
  const visualSize = size || level;
  const sizeClass = variantClasses[`h${visualSize}` as TypographyVariant];

  return (
    <Component
      className={cn(
        sizeClass,
        alignClasses[align],
        'text-gray-900 dark:text-white',
        className
      )}
    >
      {children}
    </Component>
  );
};

Heading.displayName = 'Heading';

/**
 * Paragraph component
 */
export interface ParagraphProps {
  children: React.ReactNode;
  /**
   * Paragraph size
   */
  size?: 'sm' | 'base' | 'lg';
  /**
   * Whether to add margin bottom
   */
  gutterBottom?: boolean;
  /**
   * Line height
   */
  leading?: 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose';
  /**
   * Additional CSS classes
   */
  className?: string;
}

const leadingClasses = {
  tight: 'leading-tight',
  snug: 'leading-snug',
  normal: 'leading-normal',
  relaxed: 'leading-relaxed',
  loose: 'leading-loose',
};

export const Paragraph: React.FC<ParagraphProps> = ({
  children,
  size = 'base',
  gutterBottom = true,
  leading = 'normal',
  className,
}) => {
  return (
    <p
      className={cn(
        sizeClasses[size],
        leadingClasses[leading],
        'text-gray-700 dark:text-gray-300',
        gutterBottom && 'mb-4',
        className
      )}
    >
      {children}
    </p>
  );
};

Paragraph.displayName = 'Paragraph';

/**
 * Link component
 */
export interface LinkProps {
  children: React.ReactNode;
  /**
   * Link destination
   */
  href: string;
  /**
   * Whether to open in new tab
   */
  external?: boolean;
  /**
   * Whether to show underline
   */
  underline?: 'always' | 'hover' | 'none';
  /**
   * Color variant
   */
  color?: 'primary' | 'secondary' | 'inherit';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Click handler
   */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const linkUnderlineClasses = {
  always: 'underline',
  hover: 'no-underline hover:underline',
  none: 'no-underline',
};

const linkColorClasses = {
  primary: 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300',
  secondary: 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
  inherit: '',
};

export const Link: React.FC<LinkProps> = ({
  children,
  href,
  external = false,
  underline = 'hover',
  color = 'primary',
  className,
  onClick,
}) => {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      className={cn(
        'transition-colors',
        linkUnderlineClasses[underline],
        linkColorClasses[color],
        className
      )}
    >
      {children}
    </a>
  );
};

Link.displayName = 'Link';