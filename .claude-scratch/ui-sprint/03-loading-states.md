# Phase 3: Loading States & Transitions

## Navigation
- **Previous**: [02-theme-architecture.md](02-theme-architecture.md) - Theme system implementation
- **Current**: 03-loading-states.md
- **Next**: [04-component-polish.md](04-component-polish.md) - Component refinements

## Loading State Objectives
Eliminate FOUC, implement smooth transitions, and create a premium loading experience that maintains visual consistency throughout the application.

## Current Loading Issues

### 1. Transparent Loading Screen Bug
**Symptoms**:
- Loading screen starts opaque
- Becomes transparent mid-load
- Content shows through prematurely
- Jarring visual experience

**Root Cause Analysis**:
- CSS transition timing conflicts
- Premature opacity changes
- Missing state synchronization
- Z-index management issues

### 2. Missing Skeleton Screens
**Impact Areas**:
- Library book grid
- Reader initialization
- Annotation loading
- Collection views

### 3. Transition Inconsistencies
**Problems**:
- Different timing across components
- No coordinated animations
- Harsh state changes
- Missing micro-animations

## Implementation Strategy

### 1. Global Loading State Manager

```typescript
// contexts/LoadingContext.tsx
interface LoadingState {
  isLoading: boolean;
  loadingComponent: string | null;
  progress: number;
  message: string;
}

interface LoadingContextType {
  globalLoading: LoadingState;
  componentLoading: Map<string, LoadingState>;
  startLoading: (component: string, message?: string) => void;
  updateProgress: (component: string, progress: number) => void;
  stopLoading: (component: string) => void;
}
```

### 2. Loading Screen Architecture

```typescript
// components/LoadingScreen.tsx
const LoadingScreen = () => {
  const [opacity, setOpacity] = useState(1);
  const [isVisible, setIsVisible] = useState(true);
  
  // Proper fade-out sequence
  const fadeOut = async () => {
    // Ensure content is ready
    await waitForContentReady();
    
    // Start fade animation
    setOpacity(0);
    
    // Remove from DOM after transition
    setTimeout(() => {
      setIsVisible(false);
    }, 300); // Match CSS transition duration
  };
  
  return isVisible ? (
    <div 
      className="loading-screen"
      style={{
        opacity,
        transition: 'opacity 300ms ease-in-out',
        pointerEvents: opacity === 1 ? 'auto' : 'none'
      }}
    >
      {/* Loading content */}
    </div>
  ) : null;
};
```

### 3. Skeleton Component System

```typescript
// components/skeletons/BookSkeleton.tsx
const BookSkeleton = () => (
  <div className="animate-pulse">
    <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-lg" />
    <div className="mt-2 h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
    <div className="mt-1 h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
  </div>
);

// Skeleton variants for different components
const SkeletonVariants = {
  book: BookSkeleton,
  annotation: AnnotationSkeleton,
  reader: ReaderSkeleton,
  collection: CollectionSkeleton,
};
```

### 4. Progressive Enhancement Strategy

#### Phase 3.1: Critical Path Loading
```typescript
// Priority loading sequence
const loadingSequence = [
  { component: 'auth', priority: 1 },
  { component: 'navigation', priority: 2 },
  { component: 'content', priority: 3 },
  { component: 'interactive', priority: 4 },
];
```

#### Phase 3.2: Lazy Loading Implementation
```typescript
// Dynamic imports with loading states
const LazyComponent = ({ 
  loader, 
  fallback = <Skeleton /> 
}: LazyComponentProps) => {
  const Component = lazy(loader);
  
  return (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  );
};
```

### 5. Animation System

```css
/* Coordinated animation timings */
:root {
  --animation-fast: 150ms;
  --animation-base: 300ms;
  --animation-slow: 500ms;
  --animation-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --animation-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Reusable animation classes */
.fade-in {
  animation: fadeIn var(--animation-base) var(--animation-smooth);
}

.slide-up {
  animation: slideUp var(--animation-base) var(--animation-smooth);
}

.scale-in {
  animation: scaleIn var(--animation-fast) var(--animation-spring);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(10px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from { 
    opacity: 0;
    transform: scale(0.95);
  }
  to { 
    opacity: 1;
    transform: scale(1);
  }
}
```

## Implementation Checklist

### Day 1: Foundation
- [ ] Create LoadingContext
- [ ] Fix transparent loading screen bug
- [ ] Implement proper fade sequences
- [ ] Add loading state debugging tools
- [ ] Create base Skeleton component

### Day 2: Component Integration
- [ ] Add skeletons to Library page
- [ ] Implement Reader loading states
- [ ] Create annotation loading UI
- [ ] Add collection loading states
- [ ] Integrate progress indicators

### Day 3: Polish & Optimization
- [ ] Fine-tune animation timings
- [ ] Add loading performance metrics
- [ ] Implement error states
- [ ] Create loading state documentation
- [ ] Performance testing

## Critical Fixes

### 1. Loading Screen Transparency Fix
```typescript
// Fix the transparent loading screen issue
const LoadingScreen = () => {
  const [phase, setPhase] = useState<'solid' | 'fading' | 'hidden'>('solid');
  
  useEffect(() => {
    // Only start fading when explicitly triggered
    const handleContentReady = () => {
      setPhase('fading');
      setTimeout(() => setPhase('hidden'), 300);
    };
    
    window.addEventListener('content-ready', handleContentReady);
    return () => window.removeEventListener('content-ready', handleContentReady);
  }, []);
  
  if (phase === 'hidden') return null;
  
  return (
    <div 
      className={cn(
        'fixed inset-0 z-50 bg-background',
        phase === 'fading' && 'opacity-0 transition-opacity duration-300'
      )}
    >
      {/* Loading content */}
    </div>
  );
};
```

### 2. Reader Loading Optimization
```typescript
// Prevent reader FOUC
const ReaderPage = () => {
  const [isReady, setIsReady] = useState(false);
  
  return (
    <>
      {!isReady && <ReaderSkeleton />}
      <div className={cn(!isReady && 'invisible')}>
        {/* Reader content */}
      </div>
    </>
  );
};
```

## Performance Targets

| Metric | Current | Target | Strategy |
|--------|---------|--------|----------|
| Time to First Paint | 2.5s | <1s | Optimize critical CSS |
| Time to Interactive | 4s | <2.5s | Code splitting |
| Loading Screen Duration | Variable | <2s | Predictable timing |
| Skeleton Display Time | N/A | 200ms-2s | Smart placeholders |

## Testing Strategy

### Visual Regression Testing
1. Screenshot loading states
2. Compare transitions frame-by-frame
3. Validate no FOUC occurrences
4. Check animation smoothness

### Performance Testing
```typescript
// Loading performance metrics
const measureLoadingPerformance = () => {
  performance.mark('loading-start');
  
  // After content ready
  performance.mark('loading-end');
  performance.measure('loading-duration', 'loading-start', 'loading-end');
  
  const measure = performance.getEntriesByName('loading-duration')[0];
  console.log(`Loading took ${measure.duration}ms`);
};
```

## Mobile Considerations

### Touch-Optimized Loading
- Larger touch targets during load
- Reduced animations on low-end devices
- Progressive image loading
- Optimized skeleton layouts

### Network-Aware Loading
```typescript
// Adapt loading based on connection
const getLoadingStrategy = () => {
  const connection = navigator.connection;
  if (connection?.saveData) return 'minimal';
  if (connection?.effectiveType === '4g') return 'full';
  return 'adaptive';
};
```

## Success Criteria

1. ✅ No transparent loading screen bug
2. ✅ Smooth fade transitions
3. ✅ Skeleton screens for all async content
4. ✅ Predictable loading sequences
5. ✅ No FOUC anywhere
6. ✅ Performance targets met
7. ✅ Mobile-optimized loading

## Next Phase
With loading states perfected, proceed to [04-component-polish.md](04-component-polish.md) to address component-specific UI issues.