'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Book as EpubBook, Rendition, Contents } from 'epubjs';
import { useDebounce } from '@/hooks/useDebounce';
import { readingService } from '@/services/readingService';
import { Button, Modal, Tooltip, LoadingOverlay, ProgressBar } from '@/components/ui';
import { cn } from '@/utils';

export interface ReadingSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  theme: 'light' | 'dark' | 'sepia' | 'night';
  marginHorizontal: number;
  marginVertical: number;
  textAlign: 'left' | 'justify';
  columnCount: 1 | 2;
  scrollMode: 'paginated' | 'scrolled';
}

export interface ReadingStatistics {
  wordsRead: number;
  timeSpent: number; // in seconds
  pagesRead: number;
  averageWPM: number;
  currentChapter: string;
  progress: number;
}

interface EnhancedEpubReaderProps {
  bookId: string;
  bookUrl: string;
  initialCfi?: string;
  onProgress?: (progress: number) => void;
  onAnnotation?: (annotation: any) => void;
  className?: string;
}

// Default reading settings
const defaultSettings: ReadingSettings = {
  fontSize: 16,
  fontFamily: 'Georgia, serif',
  lineHeight: 1.6,
  theme: 'light',
  marginHorizontal: 60,
  marginVertical: 40,
  textAlign: 'justify',
  columnCount: 1,
  scrollMode: 'paginated',
};

// Theme configurations
const themes = {
  light: {
    background: '#ffffff',
    color: '#000000',
    selectionBackground: 'rgba(147, 51, 234, 0.2)',
    selectionColor: '#000000',
  },
  dark: {
    background: '#1a1a1a',
    color: '#e0e0e0',
    selectionBackground: 'rgba(147, 51, 234, 0.3)',
    selectionColor: '#e0e0e0',
  },
  sepia: {
    background: '#f4ecd8',
    color: '#5c4b37',
    selectionBackground: 'rgba(147, 51, 234, 0.2)',
    selectionColor: '#5c4b37',
  },
  night: {
    background: '#000000',
    color: '#888888',
    selectionBackground: 'rgba(147, 51, 234, 0.4)',
    selectionColor: '#888888',
  },
};

// Keyboard shortcuts
const keyboardShortcuts = {
  ArrowLeft: 'prevPage',
  ArrowRight: 'nextPage',
  Space: 'nextPage',
  'Shift+Space': 'prevPage',
  Home: 'firstPage',
  End: 'lastPage',
  '+': 'increaseFontSize',
  '-': 'decreaseFontSize',
  '0': 'resetFontSize',
  f: 'toggleFullscreen',
  b: 'toggleBookmarks',
  s: 'toggleSettings',
  '/': 'search',
  Escape: 'closeModals',
} as const;

export const EnhancedEpubReader: React.FC<EnhancedEpubReaderProps> = ({
  bookId,
  bookUrl,
  initialCfi,
  onProgress,
  onAnnotation,
  className,
}) => {
  // State
  const [book, setBook] = useState<EpubBook | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [settings, setSettings] = useState<ReadingSettings>(defaultSettings);
  const [statistics, setStatistics] = useState<ReadingStatistics>({
    wordsRead: 0,
    timeSpent: 0,
    pagesRead: 0,
    averageWPM: 0,
    currentChapter: '',
    progress: 0,
  });
  const [toc, setToc] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionCfi, setSelectionCfi] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Refs
  const viewerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const wordsPerPageRef = useRef<number>(250); // Estimated words per page
  const sessionWordsRef = useRef<number>(0);

  // Debounced values
  const debouncedProgress = useDebounce(progress, 500);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(`reader-settings-${bookId}`);
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [bookId]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(`reader-settings-${bookId}`, JSON.stringify(settings));
  }, [settings, bookId]);

  // Initialize EPUB
  useEffect(() => {
    if (!viewerRef.current) return;

    const initBook = async () => {
      try {
        setLoading(true);
        
        // Dynamic import of epubjs
        const ePub = (await import('epubjs')).default;
        const newBook = ePub(bookUrl);
        
        // Set up rendition
        const newRendition = newBook.renderTo(viewerRef.current!, {
          width: '100%',
          height: '100%',
          flow: settings.scrollMode === 'scrolled' ? 'scrolled' : 'paginated',
          spread: settings.columnCount === 2 ? 'auto' : 'none',
          resizeOnOrientationChange: true,
          script: '/epub-renderer.js', // Custom renderer script
        });

        // Load navigation
        await newBook.ready;
        const navigation = await newBook.loaded.navigation;
        setToc(navigation.toc);

        // Apply initial settings
        applySettings(newRendition, settings);

        // Display initial location
        const location = initialCfi || (await getLastReadingPosition());
        await newRendition.display(location);

        // Set up event handlers
        setupEventHandlers(newBook, newRendition);

        setBook(newBook);
        setRendition(newRendition);
        setLoading(false);

        // Start reading session
        startReadingSession();
      } catch (error) {
        console.error('Failed to load book:', error);
        setLoading(false);
      }
    };

    initBook();

    return () => {
      // Cleanup
      if (rendition) {
        rendition.destroy();
      }
      if (book) {
        book.destroy();
      }
      endReadingSession();
    };
  }, [bookUrl]);

  // Apply settings to rendition
  const applySettings = useCallback((rend: Rendition, sett: ReadingSettings) => {
    if (!rend) return;

    // Apply theme
    const theme = themes[sett.theme];
    rend.themes.register('custom', {
      body: {
        background: theme.background,
        color: theme.color,
        'font-family': sett.fontFamily,
        'font-size': `${sett.fontSize}px`,
        'line-height': sett.lineHeight,
        'text-align': sett.textAlign,
        'padding-left': `${sett.marginHorizontal}px`,
        'padding-right': `${sett.marginHorizontal}px`,
        'padding-top': `${sett.marginVertical}px`,
        'padding-bottom': `${sett.marginVertical}px`,
      },
      '::selection': {
        background: theme.selectionBackground,
        color: theme.selectionColor,
      },
      img: {
        'max-width': '100%',
        height: 'auto',
        'object-fit': 'contain',
      },
      // Lazy load images
      'img[data-src]': {
        opacity: '0',
        transition: 'opacity 0.3s',
      },
      'img.loaded': {
        opacity: '1',
      },
    });
    rend.themes.select('custom');
  }, []);

  // Setup event handlers
  const setupEventHandlers = useCallback((book: EpubBook, rend: Rendition) => {
    // Location changed
    rend.on('locationChanged', (e: any) => {
      setCurrentLocation(e.start);
      updateProgress(book, e.start);
      updateStatistics(e);
    });

    // Handle selection
    rend.on('selected', (cfiRange: string, contents: Contents) => {
      const selection = contents.window.getSelection();
      if (selection) {
        const text = selection.toString();
        setSelectedText(text);
        setSelectionCfi(cfiRange);
        handleTextSelection(text, cfiRange);
      }
    });

    // Handle clicks for navigation
    rend.on('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Ignore clicks on links and interactive elements
      if (target.tagName === 'A' || target.closest('a')) {
        return;
      }

      const viewerWidth = viewerRef.current?.offsetWidth || 0;
      const clickX = e.clientX;
      
      // Navigate based on click position
      if (clickX < viewerWidth * 0.3) {
        rend.prev();
      } else if (clickX > viewerWidth * 0.7) {
        rend.next();
      }
    });

    // Handle keyboard shortcuts
    const handleKeyboard = (e: KeyboardEvent) => {
      const key = e.key;
      const shift = e.shiftKey;
      const ctrl = e.ctrlKey || e.metaKey;

      let action = '';
      if (shift && key === ' ') {
        action = 'prevPage';
        e.preventDefault();
      } else if (keyboardShortcuts[key as keyof typeof keyboardShortcuts]) {
        action = keyboardShortcuts[key as keyof typeof keyboardShortcuts];
        e.preventDefault();
      }

      executeAction(action, rend);
    };

    document.addEventListener('keydown', handleKeyboard);

    // Touch gestures for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          rend.next();
        } else {
          rend.prev();
        }
      }
    };

    viewerRef.current?.addEventListener('touchstart', handleTouchStart);
    viewerRef.current?.addEventListener('touchend', handleTouchEnd);

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyboard);
      viewerRef.current?.removeEventListener('touchstart', handleTouchStart);
      viewerRef.current?.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Execute keyboard shortcut actions
  const executeAction = useCallback((action: string, rend: Rendition) => {
    switch (action) {
      case 'nextPage':
        rend.next();
        break;
      case 'prevPage':
        rend.prev();
        break;
      case 'firstPage':
        rend.display(0);
        break;
      case 'lastPage':
        rend.display(-1);
        break;
      case 'increaseFontSize':
        updateSettings({ fontSize: Math.min(settings.fontSize + 2, 32) });
        break;
      case 'decreaseFontSize':
        updateSettings({ fontSize: Math.max(settings.fontSize - 2, 12) });
        break;
      case 'resetFontSize':
        updateSettings({ fontSize: 16 });
        break;
      case 'toggleFullscreen':
        toggleFullscreen();
        break;
      case 'toggleBookmarks':
        setShowToc(!showToc);
        break;
      case 'toggleSettings':
        setShowSettings(!showSettings);
        break;
      case 'search':
        // Open search modal
        break;
      case 'closeModals':
        setShowSettings(false);
        setShowToc(false);
        break;
    }
  }, [settings, showToc]);

  // Update progress
  const updateProgress = useCallback(async (book: EpubBook, cfi: string) => {
    const location = book.locations.locationFromCfi(cfi);
    const percentage = book.locations.percentageFromLocation(location);
    setProgress(percentage * 100);

    // Save progress to database
    if (debouncedProgress > 0) {
      await readingService.saveProgress(bookId, {
        bookId,
        position: cfi,
        percentageComplete: percentage * 100,
        chapterId: null,
        totalTimeMinutes: Math.floor((Date.now() - startTimeRef.current) / 60000),
      });
    }

    onProgress?.(percentage * 100);
  }, [bookId, debouncedProgress, onProgress]);

  // Update reading statistics
  const updateStatistics = useCallback((location: any) => {
    const currentTime = Date.now();
    const timeSpent = Math.floor((currentTime - startTimeRef.current) / 1000);
    const wordsRead = sessionWordsRef.current + wordsPerPageRef.current;
    sessionWordsRef.current = wordsRead;
    
    const wpm = timeSpent > 0 ? Math.round((wordsRead / timeSpent) * 60) : 0;

    setStatistics(prev => ({
      ...prev,
      wordsRead,
      timeSpent,
      pagesRead: prev.pagesRead + 1,
      averageWPM: wpm,
      currentChapter: location.chapter || '',
      progress: progress,
    }));
  }, [progress]);

  // Get last reading position
  const getLastReadingPosition = useCallback(async () => {
    const progress = await readingService.getProgress(bookId);
    return progress?.position || null;
  }, [bookId]);

  // Start reading session
  const startReadingSession = useCallback(async () => {
    startTimeRef.current = Date.now();
    sessionWordsRef.current = 0;
    
    await readingService.startReadingSession(bookId, {
      bookId,
      deviceInfo: {
        type: getDeviceType(),
        browser: navigator.userAgent,
        os: navigator.platform,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
    });
  }, [bookId]);

  // End reading session
  const endReadingSession = useCallback(async () => {
    await readingService.endActiveSession();
  }, []);

  // Get device type
  const getDeviceType = (): 'desktop' | 'tablet' | 'mobile' => {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  };

  // Handle text selection for annotations
  const handleTextSelection = useCallback((text: string, cfi: string) => {
    if (text.trim().length > 0) {
      onAnnotation?.({
        text,
        cfi,
        type: 'highlight',
      });
    }
  }, [onAnnotation]);

  // Update settings
  const updateSettings = useCallback((updates: Partial<ReadingSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    if (rendition) {
      applySettings(rendition, newSettings);
      
      // Handle flow changes
      if (updates.scrollMode && rendition) {
        rendition.flow(updates.scrollMode === 'scrolled' ? 'scrolled' : 'paginated');
      }
      
      // Handle spread changes
      if (updates.columnCount && rendition) {
        rendition.spread(updates.columnCount === 2 ? 'auto' : 'none');
      }
    }
  }, [settings, rendition, applySettings]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Navigation functions
  const goToChapter = useCallback((href: string) => {
    rendition?.display(href);
    setShowToc(false);
  }, [rendition]);

  const nextPage = useCallback(() => {
    rendition?.next();
  }, [rendition]);

  const prevPage = useCallback(() => {
    rendition?.prev();
  }, [rendition]);

  // Search functionality
  const searchBook = useCallback(async (query: string) => {
    if (!book || !query) return;
    
    setSearchQuery(query);
    const results = await book.search(query);
    setSearchResults(results);
  }, [book]);

  // Image lazy loading
  useEffect(() => {
    if (!rendition) return;

    rendition.hooks.content.register((contents: Contents) => {
      const images = contents.document.querySelectorAll('img[data-src]');
      
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src!;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));

      return () => {
        imageObserver.disconnect();
      };
    });
  }, [rendition]);

  return (
    <div className={cn('relative h-full bg-white dark:bg-gray-900', className)}>
      <LoadingOverlay isLoading={loading} message="Loading book..." />

      {/* Progress bar */}
      <ProgressBar
        value={progress}
        variant="primary"
        size="sm"
        className="absolute top-0 left-0 right-0 z-10"
      />

      {/* Reader toolbar */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-2">
          <Tooltip content="Table of Contents">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowToc(!showToc)}
              ariaLabel="Table of Contents"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </Tooltip>

          <Tooltip content="Settings">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSettings(!showSettings)}
              ariaLabel="Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {statistics.currentChapter}
          </span>
          <span className="text-sm font-medium">
            {progress.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Fullscreen">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleFullscreen}
              ariaLabel="Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* EPUB viewer */}
      <div
        ref={viewerRef}
        className="absolute inset-0 top-12"
        style={{
          cursor: settings.scrollMode === 'paginated' ? 'default' : 'text',
        }}
      />

      {/* Navigation buttons (for paginated mode) */}
      {settings.scrollMode === 'paginated' && (
        <>
          <button
            onClick={prevPage}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-32 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Previous page"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextPage}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-32 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Next page"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Table of Contents */}
      <Modal
        isOpen={showToc}
        onClose={() => setShowToc(false)}
        title="Table of Contents"
        size="sm"
      >
        <div className="max-h-96 overflow-y-auto">
          {toc.map((item, index) => (
            <button
              key={index}
              onClick={() => goToChapter(item.href)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="font-medium">{item.label}</div>
              {item.subitems && item.subitems.length > 0 && (
                <div className="ml-4 mt-1">
                  {item.subitems.map((subitem: any, subindex: number) => (
                    <button
                      key={subindex}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToChapter(subitem.href);
                      }}
                      className="block w-full text-left py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      {subitem.label}
                    </button>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Reading Settings"
        size="md"
      >
        <div className="space-y-6">
          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium mb-2">Font Size</label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ fontSize: Math.max(settings.fontSize - 2, 12) })}
              >
                A-
              </Button>
              <span className="flex-1 text-center">{settings.fontSize}px</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ fontSize: Math.min(settings.fontSize + 2, 32) })}
              >
                A+
              </Button>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium mb-2">Font Family</label>
            <select
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="Georgia, serif">Georgia</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Helvetica Neue', sans-serif">Helvetica</option>
              <option value="'Courier New', monospace">Courier</option>
            </select>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium mb-2">Line Height</label>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.1"
              value={settings.lineHeight}
              onChange={(e) => updateSettings({ lineHeight: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {settings.lineHeight}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.keys(themes).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSettings({ theme: theme as ReadingSettings['theme'] })}
                  className={cn(
                    'px-3 py-2 rounded-lg border-2 transition-colors',
                    settings.theme === theme
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Reading Mode */}
          <div>
            <label className="block text-sm font-medium mb-2">Reading Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateSettings({ scrollMode: 'paginated' })}
                className={cn(
                  'px-3 py-2 rounded-lg border-2 transition-colors',
                  settings.scrollMode === 'paginated'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                )}
              >
                Paginated
              </button>
              <button
                onClick={() => updateSettings({ scrollMode: 'scrolled' })}
                className={cn(
                  'px-3 py-2 rounded-lg border-2 transition-colors',
                  settings.scrollMode === 'scrolled'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                )}
              >
                Scrolled
              </button>
            </div>
          </div>

          {/* Columns */}
          <div>
            <label className="block text-sm font-medium mb-2">Columns</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateSettings({ columnCount: 1 })}
                className={cn(
                  'px-3 py-2 rounded-lg border-2 transition-colors',
                  settings.columnCount === 1
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                )}
              >
                Single
              </button>
              <button
                onClick={() => updateSettings({ columnCount: 2 })}
                className={cn(
                  'px-3 py-2 rounded-lg border-2 transition-colors',
                  settings.columnCount === 2
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                )}
              >
                Double
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Reading Statistics (shown in corner) */}
      {statistics.timeSpent > 0 && (
        <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1">
          <div>WPM: {statistics.averageWPM}</div>
          <div>Pages: {statistics.pagesRead}</div>
          <div>Time: {Math.floor(statistics.timeSpent / 60)}m</div>
        </div>
      )}
    </div>
  );
};