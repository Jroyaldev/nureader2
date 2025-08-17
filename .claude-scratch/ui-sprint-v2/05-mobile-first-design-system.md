# Phase 5: Mobile-First Design System

## Navigation
- **Previous**: [04-state-management-optimization.md](04-state-management-optimization.md) - State optimization
- **Current**: 05-mobile-first-design-system.md
- **Next**: [06-performance-and-polish.md](06-performance-and-polish.md) - Performance & polish

## Objective
Ensure the new component system and optimized state management work seamlessly across all device sizes with proper touch interactions, responsive layouts, and mobile-first design patterns.

## Current Mobile Experience Analysis

### ✅ **What's Working Well**
- **MobileToolbar**: Good touch targets and responsive behavior
- **Breakpoint System**: useBreakpoint hook provides good device detection
- **Touch Targets**: 44px minimum implemented
- **Safe Areas**: Basic safe area support added

### ❌ **What Needs Improvement**

#### 1. **Inconsistent Mobile Patterns**
```typescript
// Different mobile detection approaches
const { isMobile } = useBreakpoint();           // Good pattern
const isMobile = window.innerWidth < 768;      // Hardcoded pattern
const [isMobile, setIsMobile] = useState(false); // Manual state
```

#### 2. **Panel Mobile Adaptations**
```typescript
// SearchPanel has separate mobile/desktop rendering
if (isMobile) {
  return <BottomSheetSearch />; // 100+ lines of mobile-specific code
}
return <SidebarSearch />;       // 100+ lines of desktop code

// SettingsPanel has hardcoded mobile conditions
if (isMobile) {
  return <MobileBottomSheet />; // Different component entirely
}
```

#### 3. **Touch Interaction Gaps**
- No swipe gestures for navigation
- Inconsistent touch feedback across components
- Missing haptic feedback patterns
- No gesture-based panel controls

#### 4. **Responsive Typography Issues**
```css
/* Current: Fixed sizes that don't scale */
.text-sm { font-size: 13px; }  /* Too small on mobile */
.text-lg { font-size: 17px; }  /* Not responsive */

/* Missing fluid typography */
/* No reading distance optimization */
/* Poor text contrast on mobile in bright light */
```

## Mobile-First Design System Architecture

### 1. **Unified Responsive Components**

Instead of separate mobile/desktop components, create adaptive components:

```typescript
// /components/ui/adaptive/AdaptivePanel.tsx
interface AdaptivePanelProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ComponentType;
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
}

const AdaptivePanel = ({ position = 'right', ...props }: AdaptivePanelProps) => {
  const { isMobile, isTablet } = useBreakpoint();
  
  // Mobile: Always bottom sheet
  // Tablet: Side panels  
  // Desktop: Floating panels
  const adaptivePosition = isMobile ? 'bottom' : position;
  const adaptiveVariant = isMobile ? 'bottomSheet' : isTablet ? 'sidebar' : 'floating';
  
  return (
    <Panel 
      variant={adaptiveVariant}
      position={adaptivePosition}
      size={props.size}
      isOpen={props.isOpen}
    >
      <PanelHeader mobile={isMobile}>
        {isMobile && <PanelHandle />}
        <PanelTitle icon={props.icon}>{props.title}</PanelTitle>
        <PanelCloseButton onClick={props.onClose} />
      </PanelHeader>
      
      <PanelContent mobile={isMobile}>
        {props.children}
      </PanelContent>
    </Panel>
  );
};
```

### 2. **Gesture-Enhanced Interactions**

```typescript
// /components/ui/gestures/GesturePanel.tsx
const GesturePanel = ({ children, onClose, onSwipeDown, ...props }) => {
  const gestures = useGestures({
    onSwipeDown: () => {
      // Close panel on downward swipe
      onSwipeDown?.() || onClose();
    },
    onSwipeUp: () => {
      // Expand panel to full height
      setExpanded(true);
    },
    threshold: 50,
    enabled: true
  });
  
  return (
    <div 
      {...gestures}
      className="touch-none select-none" // Prevent text selection during gestures
    >
      {children}
    </div>
  );
};

// /components/ui/reader/SwipeableReader.tsx
const SwipeableReader = ({ onNextPage, onPrevPage }) => {
  const gestures = useGestures({
    onSwipeLeft: onNextPage,
    onSwipeRight: onPrevPage,
    threshold: 100, // Larger threshold for reading
    enabled: true
  });
  
  return (
    <div {...gestures} className="reader-content">
      {/* Reader content */}
    </div>
  );
};
```

### 3. **Fluid Typography System**

```css
/* /styles/typography/fluid.css */
:root {
  /* Base scale factors */
  --text-scale-mobile: 1.0;
  --text-scale-tablet: 1.1; 
  --text-scale-desktop: 1.2;
  
  /* Reading distance optimization */
  --reading-distance-mobile: 40cm;   /* Closer to face */
  --reading-distance-tablet: 50cm;   /* Lap distance */
  --reading-distance-desktop: 60cm;  /* Desk distance */
  
  /* Fluid typography using clamp() */
  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
  --text-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1.3rem + 1vw, 2rem);
  
  /* Reading-specific typography */
  --reading-font-size: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --reading-line-height: clamp(1.5, 1.4 + 0.2vw, 1.7);
  --reading-letter-spacing: clamp(-0.01em, -0.005em + 0.005vw, 0.01em);
}

/* Mobile-optimized reading */
@media (max-width: 768px) {
  :root {
    --reading-font-size: clamp(1.125rem, 1rem + 0.625vw, 1.25rem); /* Larger on mobile */
    --reading-line-height: clamp(1.6, 1.5 + 0.1vw, 1.8); /* More line height */
  }
}

/* High DPI displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  :root {
    --text-base: clamp(1rem, 0.95rem + 0.5vw, 1.125rem); /* Slightly smaller on retina */
  }
}
```

### 4. **Touch-Optimized Component Variants**

```typescript
// /components/ui/touch/TouchButton.tsx
interface TouchButtonProps extends ButtonProps {
  haptic?: 'light' | 'medium' | 'heavy';
  pressEffect?: 'scale' | 'opacity' | 'none';
  minSize?: 'standard' | 'large'; // 44px vs 48px
}

const TouchButton = ({ 
  haptic = 'light',
  pressEffect = 'scale',
  minSize = 'standard',
  ...props 
}: TouchButtonProps) => {
  const handlePress = useCallback(() => {
    // Haptic feedback (iOS Safari)
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[haptic]);
    }
    
    props.onClick?.();
  }, [props.onClick, haptic]);
  
  const sizeClasses = {
    standard: 'min-w-[44px] min-h-[44px]',
    large: 'min-w-[48px] min-h-[48px]'
  };
  
  const pressClasses = {
    scale: 'active:scale-95',
    opacity: 'active:opacity-70', 
    none: ''
  };
  
  return (
    <Button
      {...props}
      onClick={handlePress}
      className={cn(
        sizeClasses[minSize],
        pressClasses[pressEffect],
        'transition-transform duration-100',
        'touch-manipulation', // Optimize for touch
        '-webkit-tap-highlight-color: transparent', // Remove iOS highlight
        props.className
      )}
    />
  );
};

// /components/ui/touch/TouchSlider.tsx
const TouchSlider = ({ value, onChange, ...props }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleTouch = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (touch.clientX - rect.left) / rect.width;
    const newValue = props.min + (percentage * (props.max - props.min));
    
    onChange(Math.max(props.min, Math.min(props.max, newValue)));
  }, [props.min, props.max, onChange]);
  
  return (
    <div 
      className="relative h-12 flex items-center cursor-pointer" // Larger touch area
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
      onTouchMove={handleTouch}
    >
      <div className="w-full h-2 bg-surface-secondary rounded-full">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${((value - props.min) / (props.max - props.min)) * 100}%` }}
        />
      </div>
      <div 
        className={cn(
          "absolute w-6 h-6 bg-blue-500 rounded-full shadow-lg transition-transform",
          isDragging && "scale-125"
        )}
        style={{ 
          left: `calc(${((value - props.min) / (props.max - props.min)) * 100}% - 12px)` 
        }}
      />
    </div>
  );
};
```

### 5. **Adaptive Layout System**

```typescript
// /components/ui/layout/AdaptiveGrid.tsx
interface AdaptiveGridProps {
  children: React.ReactNode;
  minItemWidth?: number; // 200px default
  gap?: 'sm' | 'md' | 'lg';
  responsive?: boolean;
}

const AdaptiveGrid = ({ 
  minItemWidth = 200,
  gap = 'md',
  responsive = true,
  children 
}: AdaptiveGridProps) => {
  const { width } = useBreakpoint();
  
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };
  
  // Calculate columns based on container width
  const columns = responsive 
    ? Math.floor(width / (minItemWidth + 16)) // +16 for gap
    : 'auto-fit';
  
  return (
    <div 
      className={cn('grid', gapClasses[gap])}
      style={{
        gridTemplateColumns: responsive 
          ? `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`
          : `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`
      }}
    >
      {children}
    </div>
  );
};

// /components/ui/layout/SafeAreaContainer.tsx
const SafeAreaContainer = ({ children, edges = ['top', 'bottom'] }) => {
  const safeAreaClasses = edges.map(edge => `safe-area-p${edge[0]}`).join(' ');
  
  return (
    <div className={cn('relative', safeAreaClasses)}>
      {children}
    </div>
  );
};
```

## Mobile-Specific Enhancements

### 1. **Bottom Sheet Pattern**
```typescript
// /components/ui/mobile/BottomSheet.tsx
const BottomSheet = ({ isOpen, onClose, children, snapPoints = [0.3, 0.6, 0.9] }) => {
  const [currentSnap, setCurrentSnap] = useState(snapPoints[1]);
  const [isDragging, setIsDragging] = useState(false);
  
  const gestures = useGestures({
    onSwipeDown: () => {
      const currentIndex = snapPoints.indexOf(currentSnap);
      if (currentIndex > 0) {
        setCurrentSnap(snapPoints[currentIndex - 1]);
      } else {
        onClose();
      }
    },
    onSwipeUp: () => {
      const currentIndex = snapPoints.indexOf(currentSnap);
      if (currentIndex < snapPoints.length - 1) {
        setCurrentSnap(snapPoints[currentIndex + 1]);
      }
    },
    threshold: 30
  });
  
  return (
    <div className={cn(
      "fixed inset-x-0 bottom-0 z-50 transition-transform duration-300",
      isOpen ? "translate-y-0" : "translate-y-full"
    )}>
      <div 
        {...gestures}
        className="surface-glass-high rounded-t-3xl"
        style={{ height: `${currentSnap * 100}vh` }}
      >
        <div className="w-12 h-1 bg-text-tertiary rounded-full mx-auto mt-3 mb-4" />
        {children}
      </div>
    </div>
  );
};
```

### 2. **Reader Navigation Zones**
```typescript
// /components/reader/mobile/TouchNavigationZones.tsx
const TouchNavigationZones = ({ onPrevPage, onNextPage, onShowControls }) => {
  const { isMobile } = useBreakpoint();
  
  if (!isMobile) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Left zone - Previous page */}
      <div 
        className="absolute left-0 top-0 w-1/4 h-full pointer-events-auto"
        onClick={onPrevPage}
        aria-label="Previous page"
      />
      
      {/* Center zone - Show controls */}
      <div 
        className="absolute left-1/4 top-0 w-1/2 h-full pointer-events-auto"
        onClick={onShowControls}
        aria-label="Show controls"
      />
      
      {/* Right zone - Next page */}
      <div 
        className="absolute right-0 top-0 w-1/4 h-full pointer-events-auto"
        onClick={onNextPage}
        aria-label="Next page"
      />
    </div>
  );
};
```

### 3. **Performance Optimizations**
```typescript
// /hooks/mobile/useMobileOptimization.ts
const useMobileOptimization = () => {
  const { isMobile } = useBreakpoint();
  
  useEffect(() => {
    if (isMobile) {
      // Reduce animation complexity
      document.documentElement.style.setProperty('--animation-duration', '200ms');
      
      // Disable expensive effects on low-end devices
      if (navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2) {
        document.documentElement.classList.add('reduce-effects');
      }
      
      // Enable 60fps scrolling
      document.body.style.overflowScrolling = 'touch';
      
      // Optimize input handling
      const passiveEvents = ['touchstart', 'touchmove', 'wheel'];
      passiveEvents.forEach(event => {
        document.addEventListener(event, () => {}, { passive: true });
      });
    }
  }, [isMobile]);
};
```

## Implementation Plan

### Phase 5.1: Responsive Components
- [ ] Create AdaptivePanel component
- [ ] Build fluid typography system
- [ ] Implement TouchButton components
- [ ] Add gesture support to panels

### Phase 5.2: Mobile Patterns
- [ ] Build BottomSheet component
- [ ] Create TouchNavigationZones
- [ ] Implement swipe gestures
- [ ] Add haptic feedback

### Phase 5.3: Layout System
- [ ] Create AdaptiveGrid component
- [ ] Build SafeAreaContainer
- [ ] Implement responsive utilities
- [ ] Test across device sizes

### Phase 5.4: Integration & Testing
- [ ] Replace mobile/desktop splits with adaptive components
- [ ] Test on real devices
- [ ] Performance optimization
- [ ] Accessibility validation

## Success Metrics

1. **Single Codebase**: No separate mobile/desktop component variants
2. **Touch Optimization**: All interactions optimized for touch
3. **Performance**: 60fps on mid-range mobile devices
4. **Responsive**: Seamless experience across all screen sizes
5. **Gestures**: Natural swipe and touch interactions

## Device Testing Matrix

| Device Category | Screen Size | Touch | Gestures | Performance |
|----------------|-------------|--------|----------|-------------|
| Phone (Small) | 320-414px | ✅ | ✅ | 60fps |
| Phone (Large) | 414-768px | ✅ | ✅ | 60fps |
| Tablet (Portrait) | 768-1024px | ✅ | ✅ | 60fps |
| Tablet (Landscape) | 1024-1366px | ✅ | ✅ | 60fps |
| Desktop | 1366px+ | Mouse | N/A | 60fps |

## Next Phase Preview

**Phase 6** will focus on performance optimization, loading states, smooth animations, and final polish to ensure the component system performs excellently across all devices and use cases.

---

**Critical Success Factor**: The mobile experience must feel as polished and responsive as native mobile reading apps, with intuitive gestures and smooth interactions.