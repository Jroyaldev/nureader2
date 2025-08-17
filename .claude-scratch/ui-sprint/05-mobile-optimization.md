# Phase 5: Mobile Optimization

## Navigation
- **Previous**: [04-component-polish.md](04-component-polish.md) - Component refinements
- **Current**: 05-mobile-optimization.md
- **Next**: [06-testing-validation.md](06-testing-validation.md) - Testing and validation

## Mobile Optimization Objectives
Transform Arcadia Reader into a best-in-class mobile reading experience with touch-optimized interactions, responsive layouts, and performance optimizations for mobile devices.

## Current Mobile Issues

### 1. Layout Problems
- Components breaking at certain widths
- Text overflow on small screens
- Fixed positioning issues
- Horizontal scroll appearing

### 2. Interaction Issues
- Touch targets too small
- No swipe gestures
- Desktop hover states on mobile
- Missing touch feedback

### 3. Performance Problems
- Heavy animations on low-end devices
- Large bundle size
- Inefficient image loading
- Memory leaks on long sessions

### 4. iOS/Android Specific
- Safe area not respected (iPhone notch)
- Input zoom on iOS
- Android back button handling
- Status bar color mismatches

## Implementation Strategy

### 1. Mobile-First Layout System

```typescript
// hooks/useBreakpoint.ts
const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState(getCurrentBreakpoint());
  
  useEffect(() => {
    const handleResize = debounce(() => {
      setBreakpoint(getCurrentBreakpoint());
    }, 150);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return {
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
  };
};
```

### 2. Touch Gesture System

```typescript
// hooks/useGestures.ts
interface GestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onDoubleTap?: () => void;
  threshold?: number;
}

export const useGestures = (config: GestureConfig) => {
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const threshold = config.threshold || 50;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > threshold) config.onSwipeRight?.();
      else if (deltaX < -threshold) config.onSwipeLeft?.();
    } else {
      if (deltaY > threshold) config.onSwipeDown?.();
      else if (deltaY < -threshold) config.onSwipeUp?.();
    }
  };
  
  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: (e: TouchEvent) => setTouchEnd({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }),
  };
};
```

### 3. Mobile Reader Experience

```typescript
// components/reader/MobileReaderControls.tsx
const MobileReaderControls = () => {
  const { isMobile } = useBreakpoint();
  const [controlsVisible, setControlsVisible] = useState(false);
  
  // Auto-hide controls after inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [controlsVisible]);
  
  if (!isMobile) return null;
  
  return (
    <>
      {/* Tap zones for navigation */}
      <div className="fixed inset-0 flex pointer-events-none">
        <button 
          className="w-1/4 h-full pointer-events-auto"
          onClick={previousPage}
          aria-label="Previous page"
        />
        <button 
          className="flex-1 h-full pointer-events-auto"
          onClick={() => setControlsVisible(!controlsVisible)}
          aria-label="Toggle controls"
        />
        <button 
          className="w-1/4 h-full pointer-events-auto"
          onClick={nextPage}
          aria-label="Next page"
        />
      </div>
      
      {/* Bottom controls */}
      <div className={cn(
        "fixed bottom-0 inset-x-0 p-4 bg-background/95",
        "transform transition-transform duration-300",
        "safe-area-pb", // Custom class for safe area padding
        controlsVisible ? "translate-y-0" : "translate-y-full"
      )}>
        <MobileControlBar />
      </div>
    </>
  );
};
```

### 4. Responsive Component Patterns

#### Adaptive Layouts
```typescript
// components/LibraryGrid.tsx
const LibraryGrid = () => {
  const { breakpoint } = useBreakpoint();
  
  const gridCols = {
    xs: 2,
    sm: 3,
    md: 4,
    lg: 6,
    xl: 8,
  };
  
  return (
    <div 
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${gridCols[breakpoint]}, minmax(0, 1fr))`
      }}
    >
      {/* Book cards */}
    </div>
  );
};
```

#### Touch-Optimized Buttons
```css
/* Minimum touch target sizes */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  @apply flex items-center justify-center;
}

/* Touch feedback */
.touch-target:active {
  @apply scale-95 transition-transform duration-100;
}

/* Remove hover states on touch devices */
@media (hover: none) {
  .hover\:bg-accent:hover {
    background-color: transparent;
  }
}
```

### 5. Performance Optimizations

```typescript
// Mobile-specific performance improvements
const MobileOptimizations = () => {
  const { isMobile } = useBreakpoint();
  
  useEffect(() => {
    if (isMobile) {
      // Reduce animation complexity
      document.documentElement.style.setProperty('--animation-base', '200ms');
      
      // Disable backdrop filters on low-end devices
      if (navigator.hardwareConcurrency <= 2) {
        document.documentElement.classList.add('reduce-blur');
      }
      
      // Enable passive event listeners
      document.addEventListener('touchstart', () => {}, { passive: true });
    }
  }, [isMobile]);
  
  return null;
};
```

## Platform-Specific Fixes

### iOS Optimizations
```css
/* Prevent input zoom */
input, textarea, select {
  font-size: 16px !important;
}

/* Safe area handling */
.safe-area-pt {
  padding-top: env(safe-area-inset-top);
}

.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Smooth scrolling */
.scroll-container {
  -webkit-overflow-scrolling: touch;
}

/* Disable tap highlight */
* {
  -webkit-tap-highlight-color: transparent;
}
```

### Android Optimizations
```typescript
// Handle back button
useEffect(() => {
  const handleBackButton = (e: PopStateEvent) => {
    if (sidebarOpen) {
      e.preventDefault();
      closeSidebar();
    }
  };
  
  window.addEventListener('popstate', handleBackButton);
  return () => window.removeEventListener('popstate', handleBackButton);
}, [sidebarOpen]);
```

## Implementation Checklist

### Day 1: Foundation
- [ ] Implement breakpoint system
- [ ] Create gesture hooks
- [ ] Add safe area support
- [ ] Fix viewport meta tag
- [ ] Set up performance monitoring

### Day 2: Reader Mobile Experience
- [ ] Implement tap zones
- [ ] Add swipe navigation
- [ ] Create mobile controls
- [ ] Add reading progress indicator
- [ ] Optimize font sizing

### Day 3: Component Responsiveness
- [ ] Fix library grid
- [ ] Update navigation
- [ ] Make modals mobile-friendly
- [ ] Fix form layouts
- [ ] Add mobile-specific animations

## Testing Matrix

| Device | OS Version | Browser | Priority |
|--------|------------|---------|----------|
| iPhone 14 Pro | iOS 17 | Safari | Critical |
| iPhone SE | iOS 16 | Safari | High |
| Pixel 7 | Android 14 | Chrome | Critical |
| Galaxy S23 | Android 13 | Chrome | High |
| iPad Pro | iPadOS 17 | Safari | Medium |

## Performance Targets

| Metric | Desktop | Mobile | Strategy |
|--------|---------|--------|----------|
| FCP | <1.5s | <2.5s | Optimize critical CSS |
| TTI | <3s | <4s | Code splitting |
| Bundle Size | 500KB | 300KB | Tree shaking |
| Memory Usage | 150MB | 100MB | Cleanup listeners |

## Success Criteria

1. ✅ Smooth 60fps scrolling
2. ✅ All touch targets ≥44px
3. ✅ No horizontal overflow
4. ✅ Gesture navigation working
5. ✅ Safe areas respected
6. ✅ Fast load times achieved
7. ✅ Platform-specific issues fixed

## Next Phase
With mobile optimization complete, proceed to [06-testing-validation.md](06-testing-validation.md) for comprehensive testing.