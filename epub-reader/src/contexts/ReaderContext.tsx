"use client";

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useEnhancedReaderState, EnhancedReaderState, ReadingSettings, ReaderPanelState, BookState } from '@/hooks/reader/useEnhancedReaderState';
import { useReaderPersistence } from '@/hooks/reader/useReaderPersistence';

// Search result interface
interface SearchResult {
  id: string;
  text: string;
  context: string;
  chapter: string;
  chapterIndex: number;
  position: number;
}

// Reader context interface
interface ReaderContextType {
  // State
  state: EnhancedReaderState;
  derivedState: {
    hasOpenPanel: boolean;
    isLightMode: boolean;
    progressPercentage: number;
    currentTheme: 'light' | 'dark';
    hasSelectedText: boolean;
  };

  // Panel management
  panels: {
    open: (panel: keyof ReaderPanelState) => void;
    close: (panel: keyof ReaderPanelState) => void;
    closeAll: () => void;
    toggle: (panel: keyof ReaderPanelState) => void;
  };

  // Settings management
  settings: {
    update: (settings: Partial<ReadingSettings>) => void;
    reset: () => void;
    updateTheme: (theme: 'light' | 'dark') => void;
  };

  // Book operations
  book: {
    load: (bookId: string) => Promise<void>;
    search: (query: string) => Promise<SearchResult[]>;
    updateProgress: (progress: number, location: string, chapterTitle?: string) => void;
    toggleBookmark: () => void;
    update: (bookState: Partial<BookState>) => void;
  };

  // Navigation
  navigation: {
    next: () => void;
    prev: () => void;
    goTo: (location: string) => void;
    setCanNavigate: (canGoNext: boolean, canGoPrev: boolean) => void;
  };

  // Annotations
  annotation: {
    showToolbar: (x: number, y: number, text: string, cfi: string) => void;
    hideToolbar: () => void;
    showNoteModal: (x: number, y: number) => void;
    hideNoteModal: () => void;
    update: (state: any) => void;
  };

  // UI operations
  ui: {
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    hideToast: () => void;
    update: (uiState: any) => void;
  };

  // Core operations
  setLoaded: (book: any) => void;
  setError: (error: string) => void;
  setIsLoading: (loading: boolean) => void;
  setToc: (toc: any[]) => void;

  // Refs
  containerRef: React.RefObject<HTMLDivElement | null>;
  epubRendererRef: React.RefObject<any>;
}

const ReaderContext = createContext<ReaderContextType | null>(null);

interface ReaderProviderProps {
  children: React.ReactNode;
  bookId?: string;
}

export const ReaderProvider: React.FC<ReaderProviderProps> = ({ children, bookId }) => {
  const readerState = useEnhancedReaderState();
  const { 
    state, 
    derivedState, 
    actions, 
    containerRef, 
    epubRendererRef,
    userTheme,
    resolvedTheme,
    setUserTheme 
  } = readerState;

  // Set up persistence
  useReaderPersistence(state);

  // Book operations
  const bookOperations = {
    load: useCallback(async (bookId: string) => {
      try {
        actions.setIsLoading(true);
        actions.setError('');
        
        // Book loading logic would go here
        // This is a placeholder for the actual implementation
        console.log('Loading book:', bookId);
        
        actions.book.update({ id: bookId });
      } catch (error) {
        actions.setError(error instanceof Error ? error.message : 'Failed to load book');
      } finally {
        actions.setIsLoading(false);
      }
    }, [actions]),

    search: useCallback(async (query: string): Promise<SearchResult[]> => {
      try {
        // Search implementation would go here
        // This is a placeholder for the actual search logic
        console.log('Searching for:', query);
        
        // Mock search results for now
        const mockResults: SearchResult[] = [
          {
            id: '1',
            text: query,
            context: `This is a sample context containing ${query} for demonstration`,
            chapter: 'Chapter 1',
            chapterIndex: 0,
            position: 0.1
          }
        ];
        
        return mockResults;
      } catch (error) {
        actions.ui.showToast('Search failed. Please try again.', 'error');
        return [];
      }
    }, [actions]),

    updateProgress: actions.book.updateProgress,
    toggleBookmark: actions.book.toggleBookmark,
    update: actions.book.update,
  };

  // Navigation operations
  const navigationOperations = {
    next: useCallback(() => {
      if (epubRendererRef.current && state.navigation.canGoNext) {
        // Navigation logic would go here
        console.log('Navigating to next page');
        // epubRendererRef.current.next();
      }
    }, [epubRendererRef, state.navigation.canGoNext]),

    prev: useCallback(() => {
      if (epubRendererRef.current && state.navigation.canGoPrev) {
        // Navigation logic would go here
        console.log('Navigating to previous page');
        // epubRendererRef.current.prev();
      }
    }, [epubRendererRef, state.navigation.canGoPrev]),

    goTo: useCallback((location: string) => {
      if (epubRendererRef.current) {
        // Navigation logic would go here
        console.log('Navigating to location:', location);
        // epubRendererRef.current.display(location);
      }
    }, [epubRendererRef]),

    setCanNavigate: actions.navigation.setCanNavigate,
  };

  // Initialize book if bookId is provided
  useEffect(() => {
    if (bookId && bookId !== state.book.id) {
      bookOperations.load(bookId);
    }
  }, [bookId, state.book.id, bookOperations]);

  const contextValue: ReaderContextType = {
    // State
    state,
    derivedState,

    // Operations
    panels: actions.panels,
    settings: {
      ...actions.settings,
      updateTheme: actions.settings.updateTheme,
    },
    book: bookOperations,
    navigation: navigationOperations,
    annotation: actions.annotation,
    ui: actions.ui,

    // Core operations
    setLoaded: actions.setLoaded,
    setError: actions.setError,
    setIsLoading: actions.setIsLoading,
    setToc: actions.setToc,

    // Refs
    containerRef,
    epubRendererRef,
  };

  return (
    <ReaderContext.Provider value={contextValue}>
      {children}
    </ReaderContext.Provider>
  );
};

// Custom hook to use the reader context
export const useReader = (): ReaderContextType => {
  const context = useContext(ReaderContext);
  
  if (!context) {
    throw new Error('useReader must be used within a ReaderProvider');
  }
  
  return context;
};

// Export types for external use
export type { ReaderContextType, SearchResult };