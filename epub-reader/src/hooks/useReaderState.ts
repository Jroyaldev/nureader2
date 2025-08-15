"use client";

import { useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { EpubRenderer } from '@/lib/epub-renderer';
import { useTheme } from '@/providers/ThemeProvider';

// Define interfaces for state clarity
interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

interface LoadedBook {
  renderer: EpubRenderer;
  title?: string;
  author?: string;
}

interface ReaderState {
  // Core state
  loaded: LoadedBook | null;
  error: string;
  isLoading: boolean;

  // UI State
  toc: TocItem[];
  chapterTitle: string;
  isHovering: boolean;
  showToc: boolean;
  showAnnotations: boolean;
  isToolbarPinned: boolean;
  isMobile: boolean;

  // Progress & Navigation
  currentProgress: number;
  navigationState: { canGoNext: boolean; canGoPrev: boolean };

  // Annotations & Selection
  selectedText: string;
  selectionCfi: string;
  showAnnotationToolbar: boolean;
  annotationToolbarPos: { x: number; y: number };
  showNoteModal: boolean;
  notePopoverPos: { x: number; y: number };

  // Settings & Contextual Toolbar
  fontSize: number;
  showSearch: boolean;
  showSettings: boolean;
  showAIChat: boolean;
  isBookmarked: boolean;
  isFullscreen: boolean;
  timeLeft: string;

  // Refs
  containerRef: React.RefObject<HTMLDivElement>;
  epubRendererRef: React.RefObject<EpubRenderer | null>;

  // Actions
  setLoaded: (book: LoadedBook | null) => void;
  setError: (error: string) => void;
  // ... other setters will be added
}

export function useReaderState() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const epubRendererRef = useRef<EpubRenderer | null>(null);

  // Core state
  const [loaded, setLoaded] = useState<LoadedBook | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // UI state
  const [toc, setToc] = useState<TocItem[]>([]);
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(false);
  const [isToolbarPinned, setIsToolbarPinned] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Progress & Navigation
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [navigationState, setNavigationState] = useState({ canGoNext: false, canGoPrev: false });

  // Annotations & Selection
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionCfi, setSelectionCfi] = useState<string>("");
  const [annotationToolbarPos, setAnnotationToolbarPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showAnnotationToolbar, setShowAnnotationToolbar] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [notePopoverPos, setNotePopoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Settings & Contextual Toolbar
  const [fontSize, setFontSize] = useState<number>(16);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showAIChat, setShowAIChat] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Other necessary state from ReaderPage
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { theme: userTheme, resolvedTheme, setTheme: setUserTheme } = useTheme();

  // Return state and setters
  return {
    // Refs
    containerRef,
    epubRendererRef,

    // State
    loaded,
    error,
    isLoading,
    toc,
    chapterTitle,
    isHovering,
    showToc,
    showAnnotations,
    isToolbarPinned,
    isMobile,
    currentProgress,
    navigationState,
    selectedText,
    selectionCfi,
    annotationToolbarPos,
    showAnnotationToolbar,
    showNoteModal,
    notePopoverPos,
    fontSize,
    showSearch,
    showSettings,
    showAIChat,
    isBookmarked,
    isFullscreen,
    timeLeft,
    toast,
    userTheme,
    resolvedTheme,

    // Setters
    setLoaded,
    setError,
    setIsLoading,
    setToc,
    setChapterTitle,
    setIsHovering,
    setShowToc,
    setShowAnnotations,
    setIsToolbarPinned,
    setIsMobile,
    setCurrentProgress,
    setNavigationState,
    setSelectedText,
    setSelectionCfi,
    setAnnotationToolbarPos,
    setShowAnnotationToolbar,
    setShowNoteModal,
    setNotePopoverPos,
    setFontSize,
    setShowSearch,
    setShowSettings,
    setShowAIChat,
    setIsBookmarked,
    setIsFullscreen,
    setTimeLeft,
    setToast,
    setUserTheme
  };
}
