"use client";

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useGestures } from '@/hooks/useGestures';

interface TouchNavigationZonesProps {
  onPrevPage: () => void;
  onNextPage: () => void;
  onShowControls: () => void;
  onLongPress?: (x: number, y: number) => void;
  disabled?: boolean;
  showVisualZones?: boolean; // For debugging/development
  className?: string;
}

/**
 * TouchNavigationZones - Invisible touch zones for reader navigation
 * 
 * Layout:
 * ┌─────────────────────────────────┐
 * │ ←       │ Controls │       → │
 * │ Prev    │  Zone    │    Next │
 * │ 25%     │   50%    │     25% │
 * │         │          │         │
 * └─────────────────────────────────┘
 * 
 * Features:
 * - Left zone (25%): Previous page
 * - Center zone (50%): Show/hide controls
 * - Right zone (25%): Next page
 * - Swipe gestures for page navigation
 * - Long press for context menus/annotations
 * - Visual feedback during interactions
 * - Haptic feedback on navigation
 */
const TouchNavigationZones = ({
  onPrevPage,
  onNextPage,
  onShowControls,
  onLongPress,
  disabled = false,
  showVisualZones = false,
  className
}: TouchNavigationZonesProps) => {
  const { isMobile } = useBreakpoint();

  // Handle tap in different zones
  const handleZoneTap = useCallback((zone: 'left' | 'center' | 'right') => {
    if (disabled) return;

    switch (zone) {
      case 'left':
        onPrevPage();
        break;
      case 'center':
        onShowControls();
        break;
      case 'right':
        onNextPage();
        break;
    }
  }, [disabled, onPrevPage, onShowControls, onNextPage]);

  // Gesture handlers for the entire reading area
  const gestures = useGestures({
    onSwipeLeft: () => {
      if (!disabled) {
        onNextPage();
      }
    },
    onSwipeRight: () => {
      if (!disabled) {
        onPrevPage();
      }
    },
    onLongPress: (x, y) => {
      if (!disabled && onLongPress) {
        onLongPress(x, y);
      }
    },
    onTap: (x, y) => {
      if (disabled) return;

      // Determine which zone was tapped based on x position
      const element = document.elementFromPoint(x, y);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const relativeX = x - rect.left;
      const zoneWidth = rect.width / 4; // 25% zones on sides

      if (relativeX < zoneWidth) {
        handleZoneTap('left');
      } else if (relativeX > rect.width - zoneWidth) {
        handleZoneTap('right');
      } else {
        handleZoneTap('center');
      }
    },
    threshold: 100, // Larger threshold for reading navigation
    longPressDelay: 500,
    enabled: !disabled && isMobile
  });

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed inset-0 pointer-events-none z-10",
        className
      )}
      {...gestures}
      style={gestures.style}
    >
      {/* Left Zone - Previous Page */}
      <div 
        className={cn(
          "absolute left-0 top-0 w-1/4 h-full pointer-events-auto",
          showVisualZones && "bg-[#228b22]/10 border-r border-[#228b22]/30",
          disabled && "pointer-events-none"
        )}
        onClick={() => handleZoneTap('left')}
        aria-label="Previous page"
        role="button"
        tabIndex={-1}
      >
        {showVisualZones && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[#228b22] font-mono text-xs bg-white/80 px-2 py-1 rounded">
              ← Prev
            </div>
          </div>
        )}
      </div>
      
      {/* Center Zone - Show Controls */}
      <div 
        className={cn(
          "absolute left-1/4 top-0 w-1/2 h-full pointer-events-auto",
          showVisualZones && "bg-green-500/10 border-x border-green-500/30",
          disabled && "pointer-events-none"
        )}
        onClick={() => handleZoneTap('center')}
        aria-label="Show controls"
        role="button"
        tabIndex={-1}
      >
        {showVisualZones && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-green-500 font-mono text-xs bg-white/80 px-2 py-1 rounded">
              Controls
            </div>
          </div>
        )}
      </div>
      
      {/* Right Zone - Next Page */}
      <div 
        className={cn(
          "absolute right-0 top-0 w-1/4 h-full pointer-events-auto",
          showVisualZones && "bg-orange-500/10 border-l border-orange-500/30",
          disabled && "pointer-events-none"
        )}
        onClick={() => handleZoneTap('right')}
        aria-label="Next page"
        role="button"
        tabIndex={-1}
      >
        {showVisualZones && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-orange-500 font-mono text-xs bg-white/80 px-2 py-1 rounded">
              Next →
            </div>
          </div>
        )}
      </div>

      {/* Visual feedback overlay (shows briefly on interaction) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* This could be enhanced with ripple effects or visual feedback */}
      </div>
    </div>
  );
};

// Enhanced version with more sophisticated zones
export const AdvancedTouchNavigationZones = ({
  onPrevPage,
  onNextPage,
  onShowControls,
  onLongPress,
  onDoubleTap,
  disabled = false,
  verticalZones = false, // Enable top/bottom zones for additional controls
  className
}: TouchNavigationZonesProps & {
  onDoubleTap?: () => void;
  verticalZones?: boolean;
}) => {
  const { isMobile } = useBreakpoint();

  const gestures = useGestures({
    onSwipeLeft: onNextPage,
    onSwipeRight: onPrevPage,
    onLongPress,
    onDoubleTap,
    onTap: (x, y) => {
      if (disabled) return;

      const element = document.elementFromPoint(x, y);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const relativeX = x - rect.left;
      const relativeY = y - rect.top;

      // Vertical zones (if enabled)
      if (verticalZones) {
        const topZone = rect.height * 0.15; // Top 15%
        const bottomZone = rect.height * 0.85; // Bottom 15%

        if (relativeY < topZone || relativeY > bottomZone) {
          onShowControls();
          return;
        }
      }

      // Horizontal zones
      const leftZone = rect.width * 0.25;
      const rightZone = rect.width * 0.75;

      if (relativeX < leftZone) {
        onPrevPage();
      } else if (relativeX > rightZone) {
        onNextPage();
      } else {
        onShowControls();
      }
    },
    threshold: 100,
    enabled: !disabled && isMobile
  });

  if (!isMobile) return null;

  return (
    <div 
      className={cn("fixed inset-0 pointer-events-auto z-10", className)}
      {...gestures}
      style={gestures.style}
    />
  );
};

export default TouchNavigationZones;
export type { TouchNavigationZonesProps };