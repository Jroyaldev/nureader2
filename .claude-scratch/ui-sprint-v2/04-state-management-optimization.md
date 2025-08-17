# Phase 4: State Management Optimization

## Navigation
- **Previous**: [03-reader-page-refactoring.md](03-reader-page-refactoring.md) - Reader refactoring
- **Current**: 04-state-management-optimization.md
- **Next**: [05-mobile-first-design-system.md](05-mobile-first-design-system.md) - Mobile design

## Objective
Optimize state management patterns, eliminate prop drilling, and create cleaner component communication now that we have a solid component foundation and consistent theming.

## Current State Management Issues

### 1. **Props Drilling in Reader Page**
```typescript
// Current reader page props cascade
function ReaderPage() {
  const [showToc, setShowToc] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [fontSize, setFontSize] = useState(16);
  // ... 15+ more state variables
  
  return (
    <>
      <MobileToolbar 
        showToc={showToc}
        showAnnotations={showAnnotations}
        showSettings={showSettings}
        showSearch={showSearch}
        onToggleToc={() => setShowToc(!showToc)}
        onToggleAnnotations={() => setShowAnnotations(!showAnnotations)}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onToggleSearch={() => setShowSearch(!showSearch)}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        // ... 20+ more props
      />
      
      <SearchPanel 
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        // ... more props
      />
      
      <SettingsPanel
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        settings={{
          theme: currentTheme,
          fontSize: fontSize,
          // ... more settings
        }}
        onSettingsChange={(newSettings) => {
          setCurrentTheme(newSettings.theme);
          setFontSize(newSettings.fontSize);
          // ... update all settings
        }}
      />
    </>
  );
}
```

### 2. **Inconsistent State Patterns**
```typescript
// Different state management approaches across components

// UIStateContext (good pattern)
const { openSidebar, closeSidebar, currentSidebar } = useUIState();

// Direct useState (problematic for shared state)
const [showSearch, setShowSearch] = useState(false);

// Settings passed as props (causes prop drilling)
const [readingSettings, setReadingSettings] = useState(defaultSettings);

// Theme handled by context (good pattern)
const { theme, setTheme } = useTheme();
```

### 3. **Component Coupling Issues**
```typescript
// Components tightly coupled through shared state
// MobileToolbar needs to know about all panel states
// SettingsPanel needs to control reader rendering
// SearchPanel needs access to book content
// Each component manages its own version of similar state
```

## Optimized State Architecture

### 1. **Centralized Reader State**

```typescript
// /hooks/reader/useReaderState.ts
interface ReaderState {
  // UI State
  panels: {
    toc: boolean;
    search: boolean;
    settings: boolean;
    annotations: boolean;
  };
  
  // Reading State
  book: {
    id: string;
    currentLocation: string;
    progress: number;
    chapterTitle: string;
  };
  
  // Settings State
  settings: {
    theme: 'light' | 'dark';
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    // ... all reading preferences
  };
  
  // Navigation State
  navigation: {
    canGoNext: boolean;
    canGoPrev: boolean;
    isLoading: boolean;
  };
}

const useReaderState = () => {
  const [state, setState] = useState<ReaderState>(initialState);
  
  // Panel management
  const openPanel = useCallback((panel: keyof ReaderState['panels']) => {
    setState(prev => ({
      ...prev,
      panels: {
        toc: false,
        search: false,
        settings: false,
        annotations: false,
        [panel]: true
      }
    }));
  }, []);
  
  const closePanel = useCallback((panel: keyof ReaderState['panels']) => {
    setState(prev => ({
      ...prev,
      panels: {
        ...prev.panels,
        [panel]: false
      }
    }));
  }, []);
  
  // Settings management
  const updateSettings = useCallback((newSettings: Partial<ReaderState['settings']>) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings
      }
    }));
  }, []);
  
  // Navigation management
  const updateNavigation = useCallback((nav: Partial<ReaderState['navigation']>) => {
    setState(prev => ({
      ...prev,
      navigation: {
        ...prev.navigation,
        ...nav
      }
    }));
  }, []);
  
  return {
    state,
    panels: {
      open: openPanel,
      close: closePanel,
      toggle: (panel: keyof ReaderState['panels']) => {
        state.panels[panel] ? closePanel(panel) : openPanel(panel);
      }
    },
    settings: {
      update: updateSettings,
      reset: () => setState(prev => ({ ...prev, settings: initialSettings }))
    },
    navigation: {
      update: updateNavigation
    }
  };
};
```

### 2. **Reader Context Provider**

```typescript
// /contexts/ReaderContext.tsx
interface ReaderContextType {
  state: ReaderState;
  panels: {
    open: (panel: string) => void;
    close: (panel: string) => void;
    toggle: (panel: string) => void;
  };
  settings: {
    update: (settings: Partial<ReaderSettings>) => void;
    reset: () => void;
  };
  navigation: {
    next: () => void;
    prev: () => void;
    goTo: (location: string) => void;
  };
  book: {
    load: (bookId: string) => Promise<void>;
    search: (query: string) => Promise<SearchResult[]>;
  };
}

const ReaderContext = createContext<ReaderContextType | null>(null);

export const ReaderProvider = ({ children }: { children: React.ReactNode }) => {
  const readerState = useReaderState();
  const { book, epubRenderer } = useEpubReader();
  const { saveProgress } = useReadingProgress();
  
  const navigation = {
    next: useCallback(() => {
      epubRenderer?.next();
      readerState.navigation.update({ canGoPrev: true });
    }, [epubRenderer]),
    
    prev: useCallback(() => {
      epubRenderer?.prev();
      readerState.navigation.update({ canGoNext: true });
    }, [epubRenderer]),
    
    goTo: useCallback((location: string) => {
      epubRenderer?.display(location);
    }, [epubRenderer])
  };
  
  const bookOperations = {
    load: useCallback(async (bookId: string) => {
      // Load book logic
    }, []),
    
    search: useCallback(async (query: string) => {
      // Search logic
      return [];
    }, [])
  };
  
  return (
    <ReaderContext.Provider value={{
      state: readerState.state,
      panels: readerState.panels,
      settings: readerState.settings,
      navigation,
      book: bookOperations
    }}>
      {children}
    </ReaderContext.Provider>
  );
};

export const useReader = () => {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error('useReader must be used within ReaderProvider');
  }
  return context;
};
```

### 3. **Simplified Component APIs**

```typescript
// New simplified component interfaces

// SearchPanel - no more prop drilling
const SearchPanel = () => {
  const { state, panels, book } = useReader();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const handleSearch = async () => {
    const searchResults = await book.search(searchQuery);
    setResults(searchResults);
  };
  
  return (
    <ReaderPanel
      title="Search Book"
      icon={MagnifyingGlassIcon}
      isOpen={state.panels.search}
      onClose={() => panels.close('search')}
    >
      <SearchForm 
        query={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearch}
        results={results}
      />
    </ReaderPanel>
  );
};

// SettingsPanel - clean settings management
const SettingsPanel = () => {
  const { state, panels, settings } = useReader();
  
  return (
    <ReaderPanel
      title="Reading Settings"
      icon={AdjustmentsVerticalIcon}
      isOpen={state.panels.settings}
      onClose={() => panels.close('settings')}
    >
      <SettingsForm
        settings={state.settings}
        onChange={settings.update}
        onReset={settings.reset}
      />
    </ReaderPanel>
  );
};

// MobileToolbar - minimal props
const MobileToolbar = () => {
  const { state, panels, navigation, settings } = useReader();
  
  return (
    <ReaderToolbar position="top">
      <ToolbarNavigation 
        navigation={navigation}
        canGoNext={state.navigation.canGoNext}
        canGoPrev={state.navigation.canGoPrev}
      />
      
      <ToolbarActions
        panels={panels}
        currentTheme={state.settings.theme}
        onThemeChange={(theme) => settings.update({ theme })}
      />
    </ReaderToolbar>
  );
};
```

## State Persistence Strategy

### 1. **Settings Persistence**
```typescript
// /hooks/reader/useReaderPersistence.ts
const useReaderPersistence = (readerState: ReaderState) => {
  // Persist settings to localStorage and user profile
  useEffect(() => {
    localStorage.setItem('readerSettings', JSON.stringify(readerState.settings));
    
    // Debounced save to user profile
    const saveToProfile = debounce(async (settings) => {
      await updateUserProfile({ readingPreferences: settings });
    }, 1000);
    
    saveToProfile(readerState.settings);
  }, [readerState.settings]);
  
  // Persist reading progress
  useEffect(() => {
    if (readerState.book.currentLocation) {
      const saveProgress = debounce(async () => {
        await updateReadingProgress({
          bookId: readerState.book.id,
          location: readerState.book.currentLocation,
          progress: readerState.book.progress
        });
      }, 2000);
      
      saveProgress();
    }
  }, [readerState.book.currentLocation, readerState.book.progress]);
};
```

### 2. **State Hydration**
```typescript
// Load initial state from multiple sources
const useStateHydration = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    const hydrateState = async () => {
      // 1. Load from localStorage (immediate)
      const localSettings = localStorage.getItem('readerSettings');
      
      // 2. Load from user profile (async)
      const { data: profile } = await supabase
        .from('profiles')
        .select('reading_preferences')
        .single();
      
      // 3. Merge settings (profile overrides local)
      const settings = {
        ...defaultSettings,
        ...(localSettings ? JSON.parse(localSettings) : {}),
        ...(profile?.reading_preferences || {})
      };
      
      setIsHydrated(true);
      return settings;
    };
    
    hydrateState();
  }, []);
  
  return isHydrated;
};
```

## Implementation Plan

### Phase 4.1: State Architecture
- [ ] Create ReaderState interface and hook
- [ ] Build ReaderContext and provider
- [ ] Add state persistence utilities
- [ ] Test state management patterns

### Phase 4.2: Component Simplification
- [ ] Refactor SearchPanel to use context
- [ ] Refactor SettingsPanel to use context
- [ ] Refactor MobileToolbar to use context
- [ ] Remove prop drilling from reader page

### Phase 4.3: State Synchronization
- [ ] Implement settings persistence
- [ ] Add reading progress sync
- [ ] Handle offline/online state
- [ ] Test state consistency

### Phase 4.4: Performance Optimization
- [ ] Add state selectors for performance
- [ ] Implement memo patterns
- [ ] Optimize re-render patterns
- [ ] Benchmark state updates

## State Management Patterns

### 1. **Single Source of Truth**
```typescript
// All reader state lives in one place
const readerState = {
  panels: { /* panel visibility */ },
  settings: { /* reading preferences */ },
  book: { /* current book state */ },
  navigation: { /* navigation state */ }
};
```

### 2. **Derived State**
```typescript
// Compute derived values from base state
const derivedState = useMemo(() => ({
  hasOpenPanel: Object.values(state.panels).some(Boolean),
  isLightMode: state.settings.theme === 'light',
  progressPercentage: Math.round(state.book.progress * 100)
}), [state]);
```

### 3. **Action-Based Updates**
```typescript
// Use actions for complex state updates
const actions = {
  togglePanel: (panel: string) => {
    // Close other panels, open requested panel
  },
  
  applyTheme: (theme: string) => {
    // Update theme, apply to renderer, persist
  },
  
  navigateToLocation: (location: string) => {
    // Update renderer, save progress, update state
  }
};
```

## Success Metrics

1. **Props Reduction**: 80%+ reduction in props passed to components
2. **State Consistency**: Single source of truth for all reader state
3. **Performance**: No regression in state update times
4. **Developer Experience**: Easier to add new reader features
5. **Maintainability**: Clear separation of concerns

## Risk Mitigation

### Potential Issues
- **State Management Complexity**: Keep patterns simple and well-documented
- **Performance Regression**: Use selectors and memo patterns
- **Migration Complexity**: Incremental migration approach

### Testing Strategy
- **Unit Tests**: Test state hooks in isolation
- **Integration Tests**: Test component interactions
- **Performance Tests**: Benchmark before/after
- **User Tests**: Ensure no functional regression

## Next Phase Preview

**Phase 5** will focus on mobile-first design patterns, ensuring the new component system and state management work seamlessly across all device sizes with proper touch interactions and responsive layouts.

---

**Key Success Factor**: After optimization, adding new reader features should require minimal props and state management complexity, with clear patterns for component communication.