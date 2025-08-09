/**
 * Navigation Components Index
 * 
 * Exports all navigation components for easy importing.
 */

export { BottomNavigation, BottomNavigationItem } from './BottomNavigation';
export { Drawer } from './Drawer';
export { TabBar } from './TabBar';
export { HamburgerMenu, MobileHeader, MobileMenu } from './MobileNavigation';
export { 
  MobileNavigationProvider,
  TouchTarget,
  SwipeContainer,
  ResponsiveNavigationWrapper,
  MOBILE_NAVIGATION_CONSTANTS,
  useMobileNavigation,
  useIsMobile,
  useHasTouch,
  useOrientation,
  useSafeAreaInsets,
} from './MobileNavigationUtils';

// Re-export types
export type { BottomNavigationProps, BottomNavigationItemProps } from './BottomNavigation';
export type { DrawerProps } from './Drawer';
export type { TabBarProps, TabItemProps } from './TabBar';
export type { HamburgerMenuProps, MobileHeaderProps, MobileMenuProps } from './MobileNavigation';
export type { 
  MobileNavigationProviderProps,
  TouchTargetProps,
  SwipeContainerProps,
  ResponsiveNavigationWrapperProps,
} from './MobileNavigationUtils';