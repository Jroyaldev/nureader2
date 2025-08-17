"use client";

import { useEffect } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

/**
 * Component that applies mobile-specific performance optimizations
 * Should be included in the main layout
 */
export const MobileOptimizations = () => {
  const { isMobile } = useBreakpoint();
  
  useEffect(() => {
    if (isMobile) {
      // Reduce animation complexity on mobile
      document.documentElement.style.setProperty('--animation-base', '200ms');
      
      // Disable backdrop filters on low-end devices
      if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 2) {
        document.documentElement.classList.add('reduce-blur');
      }
      
      // Add mobile-specific classes
      document.documentElement.classList.add('mobile-device');
      
      // Enable passive event listeners for better scroll performance
      const passiveOptions = { passive: true };
      const handleTouch = () => {}; // Dummy handler to register passive listener
      
      document.addEventListener('touchstart', handleTouch, passiveOptions);
      document.addEventListener('touchmove', handleTouch, passiveOptions);
      
      // Cleanup
      return () => {
        document.removeEventListener('touchstart', handleTouch);
        document.removeEventListener('touchmove', handleTouch);
        document.documentElement.classList.remove('mobile-device');
      };
    } else {
      // Desktop optimizations
      document.documentElement.style.setProperty('--animation-base', '300ms');
      document.documentElement.classList.remove('reduce-blur', 'mobile-device');
    }
  }, [isMobile]);
  
  useEffect(() => {
    // Handle Android back button for sidebars/modals
    const handleBackButton = (e: PopStateEvent) => {
      // Check if any modal or sidebar is open
      const openModal = document.querySelector('[data-modal-open="true"]');
      const openSidebar = document.querySelector('[data-sidebar-open="true"]');
      
      if (openModal || openSidebar) {
        e.preventDefault();
        // Close the topmost modal/sidebar
        if (openModal) {
          const closeButton = openModal.querySelector('[data-close-modal]');
          (closeButton as HTMLElement)?.click();
        } else if (openSidebar) {
          const closeButton = openSidebar.querySelector('[data-close-sidebar]');
          (closeButton as HTMLElement)?.click();
        }
      }
    };
    
    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, []);
  
  return null; // This component doesn't render anything
};