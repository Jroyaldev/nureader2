"use client";

import { useState, useRef, useCallback, useMemo } from 'react';
import { EpubRenderer } from '@/lib/epub-renderer';
import { useTheme } from '@/providers/ThemeProvider';

// Improved interfaces for better organization
interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

interface LoadedBook {
  renderer: EpubRenderer;
  title?: string;
  author?: string;
  id: string;
}

interface ReaderPanelState {
  toc: boolean;
  search: boolean;
  settings: boolean;
  annotations: boolean;
  aiChat: boolean;
}

interface ReadingSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  marginHorizontal: number;
  marginVertical: number;
  maxWidth: number;
  textAlign: 'left' | 'justify';
  autoHideToolbar: boolean;
  readingSpeed: number; // WPM
  brightness: number;
  contrast: number;
}

interface BookState {
  id: string;
  title?: string;
  author?: string;
  currentLocation: string;
  chapterTitle: string;
  progress: number;
  timeLeft: string;
  isBookmarked: boolean;
}

interface NavigationState {
  canGoNext: boolean;
  canGoPrev: boolean;
  isLoading: boolean;
}

interface AnnotationState {
  selectedText: string;
  selectionCfi: string;
  showToolbar: boolean;
  toolbarPos: { x: number; y: number };
  showNoteModal: boolean;
  notePopoverPos: { x: number; y: number };
}

interface UIState {
  isMobile: boolean;
  isHovering: boolean;
  isToolbarPinned: boolean;
  isFullscreen: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
}

// Consolidated state interface
interface EnhancedReaderState {
  // Core state
  loaded: LoadedBook | null;
  error: string;
  isLoading: boolean;
  toc: TocItem[];
  
  // Organized state sections
  panels: ReaderPanelState;
  settings: ReadingSettings;
  book: BookState;
  navigation: NavigationState;
  annotation: AnnotationState;
  ui: UIState;
}

// Default state values
const defaultSettings: ReadingSettings = {
  fontSize: 16,
  fontFamily: "'Inter', sans-serif",
  lineHeight: 1.6,
  letterSpacing: 0,
  marginHorizontal: 40,
  marginVertical: 20,
  maxWidth: 0, // 0 means full width
  textAlign: 'left',
  autoHideToolbar: true,
  readingSpeed: 250,
  brightness: 100,
  contrast: 100,
};

const defaultPanelState: ReaderPanelState = {
  toc: false,
  search: false,
  settings: false,
  annotations: false,
  aiChat: false,
};

const defaultBookState: BookState = {
  id: '',
  title: '',
  author: '',
  currentLocation: '',
  chapterTitle: '',
  progress: 0,
  timeLeft: '',
  isBookmarked: false,
};

const defaultNavigationState: NavigationState = {
  canGoNext: false,
  canGoPrev: false,
  isLoading: false,
};

const defaultAnnotationState: AnnotationState = {
  selectedText: '',
  selectionCfi: '',
  showToolbar: false,
  toolbarPos: { x: 0, y: 0 },
  showNoteModal: false,
  notePopoverPos: { x: 0, y: 0 },
};

const defaultUIState: UIState = {
  isMobile: false,
  isHovering: false,
  isToolbarPinned: true,
  isFullscreen: false,
  toast: null,
};

export function useEnhancedReaderState() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const epubRendererRef = useRef<EpubRenderer | null>(null);
  const { theme: userTheme, resolvedTheme, setTheme: setUserTheme } = useTheme();

  // Core state
  const [loaded, setLoaded] = useState<LoadedBook | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toc, setToc] = useState<TocItem[]>([]);

  // Organized state sections
  const [panels, setPanels] = useState<ReaderPanelState>(defaultPanelState);
  const [settings, setSettings] = useState<ReadingSettings>(defaultSettings);
  const [book, setBook] = useState<BookState>(defaultBookState);
  const [navigation, setNavigation] = useState<NavigationState>(defaultNavigationState);
  const [annotation, setAnnotation] = useState<AnnotationState>(defaultAnnotationState);
  const [ui, setUI] = useState<UIState>(defaultUIState);

  // Panel management actions
  const panelActions = useMemo(() => ({
    open: useCallback((panel: keyof ReaderPanelState) => {
      setPanels(prev => ({
        ...defaultPanelState, // Close all panels first
        [panel]: true
      }));
    }, []),

    close: useCallback((panel: keyof ReaderPanelState) => {
      setPanels(prev => ({
        ...prev,
        [panel]: false
      }));
    }, []),

    closeAll: useCallback(() => {
      setPanels(defaultPanelState);
    }, []),

    toggle: useCallback((panel: keyof ReaderPanelState) => {
      setPanels(prev => ({
        ...defaultPanelState, // Close other panels
        [panel]: !prev[panel]
      }));
    }, [])
  }), []);

  // Settings management actions
  const settingsActions = useMemo(() => ({
    update: useCallback((newSettings: Partial<ReadingSettings>) => {
      setSettings(prev => ({
        ...prev,
        ...newSettings
      }));
    }, []),

    reset: useCallback(() => {
      setSettings(defaultSettings);
    }, []),

    updateTheme: useCallback((theme: 'light' | 'dark') => {
      setUserTheme(theme);
    }, [setUserTheme])
  }), [setUserTheme]);

  // Book state actions
  const bookActions = useMemo(() => ({
    update: useCallback((newBookState: Partial<BookState>) => {
      setBook(prev => ({
        ...prev,
        ...newBookState
      }));
    }, []),

    updateProgress: useCallback((progress: number, location: string, chapterTitle?: string) => {
      setBook(prev => ({
        ...prev,
        progress,
        currentLocation: location,
        ...(chapterTitle && { chapterTitle })
      }));
    }, []),

    toggleBookmark: useCallback(() => {
      setBook(prev => ({
        ...prev,
        isBookmarked: !prev.isBookmarked
      }));
    }, [])
  }), []);

  // Navigation actions
  const navigationActions = useMemo(() => ({
    update: useCallback((newNavState: Partial<NavigationState>) => {
      setNavigation(prev => ({
        ...prev,
        ...newNavState
      }));
    }, []),

    setCanNavigate: useCallback((canGoNext: boolean, canGoPrev: boolean) => {
      setNavigation(prev => ({
        ...prev,
        canGoNext,
        canGoPrev
      }));
    }, [])
  }), []);

  // Annotation actions
  const annotationActions = useMemo(() => ({
    update: useCallback((newAnnotationState: Partial<AnnotationState>) => {
      setAnnotation(prev => ({
        ...prev,
        ...newAnnotationState
      }));
    }, []),

    showToolbar: useCallback((x: number, y: number, text: string, cfi: string) => {
      setAnnotation(prev => ({
        ...prev,
        selectedText: text,
        selectionCfi: cfi,
        showToolbar: true,
        toolbarPos: { x, y }
      }));
    }, []),

    hideToolbar: useCallback(() => {
      setAnnotation(prev => ({
        ...prev,
        showToolbar: false,
        selectedText: '',
        selectionCfi: ''
      }));
    }, []),

    showNoteModal: useCallback((x: number, y: number) => {
      setAnnotation(prev => ({
        ...prev,
        showNoteModal: true,
        notePopoverPos: { x, y }
      }));
    }, []),

    hideNoteModal: useCallback(() => {
      setAnnotation(prev => ({
        ...prev,
        showNoteModal: false
      }));
    }, [])
  }), []);

  // UI actions
  const uiActions = useMemo(() => ({
    update: useCallback((newUIState: Partial<UIState>) => {
      setUI(prev => ({
        ...prev,
        ...newUIState
      }));
    }, []),

    showToast: useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setUI(prev => ({
        ...prev,
        toast: { message, type }
      }));
      
      // Auto-hide toast after 3 seconds
      setTimeout(() => {
        setUI(prev => ({
          ...prev,
          toast: null
        }));
      }, 3000);
    }, []),

    hideToast: useCallback(() => {
      setUI(prev => ({
        ...prev,
        toast: null
      }));
    }, [])
  }), []);

  // Derived state for convenience
  const derivedState = useMemo(() => ({
    hasOpenPanel: Object.values(panels).some(Boolean),
    isLightMode: resolvedTheme === 'light',
    progress: book.progress,
    currentTheme: resolvedTheme as 'light' | 'dark',
    hasSelectedText: annotation.selectedText.length > 0,
  }), [panels, resolvedTheme, book.progress, annotation.selectedText]);

  // Consolidated state object
  const state: EnhancedReaderState = {
    loaded,
    error,
    isLoading,
    toc,
    panels,
    settings,
    book,
    navigation,
    annotation,
    ui,
  };

  return {
    // Refs
    containerRef,
    epubRendererRef,

    // State
    state,
    derivedState,

    // Actions
    actions: {
      // Core actions
      setLoaded,
      setError,
      setIsLoading,
      setToc,

      // Organized actions
      panels: panelActions,
      settings: settingsActions,
      book: bookActions,
      navigation: navigationActions,
      annotation: annotationActions,
      ui: uiActions,
    },

    // Legacy compatibility (for gradual migration)
    userTheme,
    resolvedTheme,
    setUserTheme,
  };
}

export type { EnhancedReaderState, ReadingSettings, ReaderPanelState, BookState };