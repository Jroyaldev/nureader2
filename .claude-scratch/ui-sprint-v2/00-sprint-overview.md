# UI Component System Refactoring Sprint

## Sprint Objectives
Transform the reader page UI into a cohesive, theme-aware component system with proper abstractions and reusable patterns. Focus on eliminating hardcoded colors, creating consistent theming, and building robust component foundations.

## Core Problems Identified

### 1. **Inconsistent Theme Implementation**
- TOC works perfectly with theme switching
- SearchPanel, MobileToolbar, SettingsPanel have hardcoded colors
- No standardized approach to light/dark mode styling
- CSS variables not consistently used across components

### 2. **Component Pattern Inconsistency**
- Glass effects implemented differently across components
- Button styles duplicated and hardcoded
- Modal patterns vary between mobile/desktop
- No shared component library for reader UI

### 3. **Reader Page Complexity**
- Multiple overlapping UI systems
- Inconsistent state management patterns
- Props drilling for theme/UI state
- Component responsibilities not clearly defined

## Sprint Structure

### Phase 1: Theme Architecture Foundation
- **Goal**: Create bulletproof theme system that eliminates hardcoded colors
- **Focus**: CSS variable system, theme inheritance patterns
- **Deliverable**: Every component responds properly to theme changes

### Phase 2: Component Library Creation  
- **Goal**: Build reusable components with consistent APIs
- **Focus**: Buttons, Modals, Panels, Glass containers
- **Deliverable**: Shared component library in `/components/ui/`

### Phase 3: Reader Page Refactoring
- **Goal**: Systematically replace hardcoded components with reusable ones
- **Focus**: SearchPanel, SettingsPanel, MobileToolbar consistency
- **Deliverable**: All reader components use shared patterns

### Phase 4: State Management Optimization
- **Goal**: Clean up prop drilling and state inconsistencies
- **Focus**: Context optimization, component communication
- **Deliverable**: Simplified component tree and data flow

### Phase 5: Mobile-First Design System
- **Goal**: Ensure responsive patterns work across all components
- **Focus**: Touch targets, spacing, typography scales
- **Deliverable**: Consistent mobile experience

### Phase 6: Performance & Polish
- **Goal**: Loading states, animations, final optimizations
- **Focus**: Skeleton screens, smooth transitions, code splitting
- **Deliverable**: Production-ready component system

## Success Criteria

1. **Theme Consistency**: All components respond identically to theme changes
2. **Component Reusability**: No duplicated styling patterns
3. **Maintainability**: Clear component hierarchy and APIs
4. **Performance**: No regression in loading/interaction times
5. **Developer Experience**: Easy to add new reader UI components

## Directory Structure Strategy

```
epub-reader/src/
├── components/
│   ├── ui/                    # Shared UI components
│   │   ├── Button/
│   │   ├── Modal/
│   │   ├── Panel/
│   │   └── Glass/
│   ├── reader/               # Reader-specific components
│   │   ├── panels/          # SearchPanel, SettingsPanel, etc.
│   │   ├── toolbars/        # MobileToolbar, ContextualToolbar
│   │   └── core/            # ReaderContainer, Navigation
│   └── shared/              # Cross-app components
├── styles/
│   ├── themes/              # Theme definitions
│   ├── components/          # Component-specific styles
│   └── utilities/           # Utility classes
└── hooks/
    ├── ui/                  # UI-specific hooks
    └── reader/              # Reader-specific hooks
```

## Key Insights from Previous Sprint

### What Worked Well
- **TOC Component**: Perfect theme implementation with CSS variables
- **UIStateContext**: Clean sidebar management solution
- **Glass CSS Classes**: Good foundation, needs standardization
- **Mobile Optimization**: Solid foundation with useBreakpoint

### What Needs Improvement
- **Hardcoded Colors**: Still present in SearchPanel, MobileToolbar, SettingsPanel
- **Component Duplication**: Similar patterns implemented differently
- **Theme Inheritance**: Not all components inherit theme properly
- **Component Organization**: Reader components need better structure

## Implementation Strategy

### 1. **Theme-First Approach**
Every component must be built with theme switching as a primary requirement, not an afterthought.

### 2. **Component Composition**
Build small, focused components that compose into larger UI patterns.

### 3. **Reader Page Focus**
All improvements center around the reader experience where users spend most time.

### 4. **Progressive Enhancement**
Start with core functionality, add polish incrementally.

### 5. **Smart Refactoring**
Reuse existing patterns that work (like TOC), eliminate patterns that don't.

## Sprint Timeline

- **Phase 1-2**: Foundation (Theme system + Component library)
- **Phase 3-4**: Reader refactoring (Component replacement + State cleanup)  
- **Phase 5-6**: Polish (Mobile + Performance optimization)

## Next Steps

Ready to begin **Phase 1: Theme Architecture Foundation** with a systematic analysis of current theme patterns and creation of a bulletproof theme system.

---

*This sprint builds on the successful UI improvements from the previous sprint while addressing the root causes of theme inconsistencies and component duplication.*