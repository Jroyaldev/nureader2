/* Enhanced UI Component Library - Theme-Aware Components */
/* Based on successful TableOfContents patterns, ensuring consistent theming */

// Core Components
export { Button } from './core/Button/Button';
export { IconButton } from './core/Button/IconButton';
export { TouchButton } from './core/Button/TouchButton';

export { GlassContainer } from './core/Glass/GlassContainer';
export { GlassModal } from './core/Glass/GlassModal';

export { Panel } from './core/Panel/Panel';
export { PanelHeader } from './core/Panel/PanelHeader';
export { PanelContent } from './core/Panel/PanelContent';

// Reader-Specific Components
export { ReaderPanel } from './reader/ReaderPanel';
export { ReaderButton } from './reader/ReaderButton';
export { ReaderToolbar } from './reader/ReaderToolbar';

// Theme Utilities
export { cn, getGlassClasses, getReaderClasses, componentPatterns } from '../../utils/theme';

// Type Definitions
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'reader';
export type GlassOpacity = 'low' | 'medium' | 'high' | 'solid';
export type PanelVariant = 'floating' | 'sidebar' | 'modal' | 'toolbar' | 'bottomSheet';
export type ComponentSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';