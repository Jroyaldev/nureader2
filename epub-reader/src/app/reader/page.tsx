"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import AnnotationPanel from "@/components/AnnotationPanel";
import AnnotationToolbar from "@/components/AnnotationToolbar";
import NoteModal from "@/components/NoteModal";
import Tooltip from "@/components/TooltipImproved";
import { useTheme } from "@/providers/ThemeProvider";
import { EpubRenderer } from "@/lib/epub-renderer";

interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

type LoadedBook = {
  renderer: EpubRenderer;
  title?: string;
  author?: string;
};

const defaultBookUrl = "/sample.epub";

export default function ReaderPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const epubRendererRef = useRef<EpubRenderer | null>(null);
  const [loaded, setLoaded] = useState<LoadedBook | null>(null);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { theme: userTheme, resolvedTheme, setTheme: setUserTheme } = useTheme();
  const [localThemeOverride, setLocalThemeOverride] = useState<"light" | "dark" | null>(null);
  const theme = localThemeOverride || resolvedTheme;
  const [isLoading, setIsLoading] = useState(true);
  
  // UI state
  const [toc, setToc] = useState<TocItem[]>([]);
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(false);
  const [isToolbarSticky, setIsToolbarSticky] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [bookData, setBookData] = useState<any>(null);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [savedProgress, setSavedProgress] = useState<{location: string, percentage: number} | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [containerReady, setContainerReady] = useState<boolean>(false);
  const [navigationState, setNavigationState] = useState({ canGoNext: false, canGoPrev: false });
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionCfi, setSelectionCfi] = useState<string>("");
  const [annotationToolbarPos, setAnnotationToolbarPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showAnnotationToolbar, setShowAnnotationToolbar] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const bookId = searchParams.get('id');

  // Clean up renderer on unmount
  useEffect(() => {
    return () => {
      if (epubRendererRef.current) {
        epubRendererRef.current.destroy();
        epubRendererRef.current = null;
      }
    };
  }, []);

  const loadFromFile = useCallback(async (file: File) => {
    setError("");
    setIsLoading(true);
    console.log("📚 Loading EPUB file with new renderer:", file.name);

    // Clean up any existing renderer
    if (epubRendererRef.current) {
      epubRendererRef.current.destroy();
      epubRendererRef.current = null;
    }

    try {
      if (!containerRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!containerRef.current) {
          setError("Reader container not ready");
          return;
        }
      }

      // Create new epub renderer
      const renderer = new EpubRenderer(containerRef.current);
      epubRendererRef.current = renderer;

      // Set up progress tracking
      renderer.onProgress((progress) => {
        setCurrentProgress(progress);
      });

      // Set up chapter tracking
      renderer.onChapterChange((title) => {
        setChapterTitle(title);
        // Update navigation state
        const position = renderer.getCurrentPosition();
        setNavigationState({
          canGoNext: position.canGoNext,
          canGoPrev: position.canGoPrev
        });
      });

      // Set up text selection tracking
      renderer.onTextSelect((text, cfi) => {
        setSelectedText(text);
        setSelectionCfi(cfi);
        
        // Get selection coordinates for toolbar positioning
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setAnnotationToolbarPos({
            x: rect.left + rect.width / 2,
            y: rect.top + window.scrollY
          });
          setShowAnnotationToolbar(true);
        }
      });

      // Load the book
      const { title, author } = await renderer.loadBook(file);

      // Get table of contents
      const tocItems = renderer.getTableOfContents();
      setToc(tocItems);

      // Apply current theme
      renderer.setTheme(theme);

      setLoaded({ renderer, title, author });
      console.log("✅ EPUB loaded successfully with new renderer:", { title, author });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load EPUB. Please try a different file.";
      console.error('❌ EPUB loading failed:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [theme]);

  // Monitor auth state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthReady(!!session);
      } catch {
        setAuthReady(false);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthReady(!!session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Monitor container readiness and detect mobile
  useEffect(() => {
    const checkContainer = () => {
      if (containerRef.current) {
        setContainerReady(true);
      }
    };
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkContainer();
    checkMobile();
    
    const timeout = setTimeout(checkContainer, 100);
    
    window.addEventListener('resize', checkMobile);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Load book from Supabase if book ID is provided
  useEffect(() => {
    const loadBookFromDatabase = async () => {
      if (!bookId) {
        setIsLoading(false);
        return;
      }

      if (!authReady || !containerReady) {
        return;
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setIsLoading(false);
          router.push('/login');
          return;
        }

        const { data: book, error: bookError } = await supabase
          .from('books')
          .select('*')
          .eq('id', bookId)
          .eq('user_id', user.id)
          .single();

        if (bookError || !book) {
          setError("Book not found");
          setIsLoading(false);
          return;
        }

        setBookData(book);

        const { data: fileData, error: storageError } = await supabase.storage
          .from('epub-files')
          .download(book.file_path);

        if (storageError || !fileData) {
          setError("Failed to load book file");
          setIsLoading(false);
          return;
        }

        const file = new File([fileData], book.title + '.epub', { type: 'application/epub+zip' });
        await loadFromFile(file);
        
        // Load saved reading progress after a short delay
        if (bookId) {
          setTimeout(() => {
            loadReadingProgress();
          }, 1000);
        }
        
      } catch (err) {
        console.error('❌ Error loading book:', err);
        setError("Failed to load book");
        setIsLoading(false);
      }
    };

    loadBookFromDatabase();
  }, [bookId, authReady, containerReady, loadFromFile, router, supabase]);

  // Save reading progress to database
  const saveReadingProgress = useCallback(async (progress: number) => {
    if (!bookId || !authReady) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const container = containerRef.current;
      if (!container) return;

      const scrollHeight = container.scrollHeight - container.clientHeight;
      const currentLocation = `${container.scrollTop}:${scrollHeight}`;

      console.log('💾 Saving reading progress:', progress + '%', 'at location:', currentLocation);

      // Get current CFI position
      const cfi = epubRendererRef.current?.getCurrentCfi() || currentLocation;
      
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          current_location: cfi,
          progress_percentage: progress,
          last_read_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,book_id'
        });

      if (error) {
        console.error('Error saving reading progress:', error);
      } else {
        console.log('✅ Progress saved successfully');
      }
    } catch (error) {
      console.error('Error saving reading progress:', error);
    }
  }, [bookId, authReady, supabase]);

  // Load reading progress from database
  const loadReadingProgress = useCallback(async () => {
    if (!bookId || !authReady) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('📖 Loading reading progress for book:', bookId);
      
      const { data: progress, error } = await supabase
        .from('reading_progress')
        .select('current_location, progress_percentage, reading_time_minutes')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading reading progress:', error);
        return;
      }

      if (progress) {
        console.log('✅ Found saved progress:', progress.progress_percentage + '%');
        setSavedProgress({
          location: progress.current_location,
          percentage: progress.progress_percentage
        });
        setCurrentProgress(progress.progress_percentage);
        
        // Restore reading position if renderer is ready
        if (epubRendererRef.current && progress.current_location) {
          // Try to display the saved CFI
          const restored = epubRendererRef.current.displayCfi(progress.current_location);
          if (!restored) {
            // Fallback to old format if CFI display fails
            const [savedScrollTop, savedScrollHeight] = progress.current_location.split(':').map(Number);
            
            if (!isNaN(savedScrollTop) && !isNaN(savedScrollHeight) && containerRef.current) {
              const container = containerRef.current;
              const currentScrollHeight = container.scrollHeight - container.clientHeight;
              const scrollRatio = savedScrollTop / savedScrollHeight;
              const newScrollTop = Math.max(0, Math.min(scrollRatio * currentScrollHeight, currentScrollHeight));
              container.scrollTop = newScrollTop;
            }
          }
        }
      } else {
        console.log('📝 No saved progress found for this book');
      }
    } catch (error) {
      console.error('Error loading reading progress:', error);
    }
  }, [bookId, authReady, supabase]);

  // Save progress periodically while reading
  useEffect(() => {
    if (!bookId || !authReady) return;
    
    const interval = setInterval(() => {
      if (currentProgress > 0) {
        saveReadingProgress(currentProgress);
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [bookId, authReady, currentProgress, saveReadingProgress]);

  // Auto-save progress with debouncing
  useEffect(() => {
    if (!bookId || currentProgress === 0) return;
    
    const timeoutId = setTimeout(() => {
      saveReadingProgress(currentProgress);
    }, 2000); // Save after 2 seconds of no scroll activity

    return () => clearTimeout(timeoutId);
  }, [currentProgress, bookId, saveReadingProgress]);

  // Save progress on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (bookId && currentProgress > 0) {
        // Use navigator.sendBeacon for reliable saving on page unload
        const data = new FormData();
        data.append('bookId', bookId);
        data.append('progress', currentProgress.toString());
        navigator.sendBeacon('/api/save-progress', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [bookId, currentProgress]);

  const onPick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const loadDefault = useCallback(async () => {
    try {
      const res = await fetch(defaultBookUrl);
      if (!res.ok) return;
      const blob = await res.blob();
      const file = new File([blob], "sample.epub", { type: "application/epub+zip" });
      await loadFromFile(file);
    } catch {}
  }, [loadFromFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void loadFromFile(file);
  }, [loadFromFile]);

  useEffect(() => {
    if (!loaded && !bookId && !isLoading) {
      void loadDefault();
    }
  }, [loaded, loadDefault, bookId, isLoading]);

  // Apply theme when it changes
  useEffect(() => {
    if (epubRendererRef.current) {
      epubRendererRef.current.setTheme(theme);
    }
  }, [theme]);

  const onThemeToggle = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setLocalThemeOverride(newTheme);
    
    if (userTheme !== "system") {
      setUserTheme(newTheme);
    }
  }, [theme, userTheme, setUserTheme]);

  const onTocJump = useCallback(async (href: string) => {
    if (epubRendererRef.current) {
      epubRendererRef.current.jumpToChapter(href);
      setShowToc(false);
    }
  }, []);

  const toggleToc = useCallback(() => {
    setShowToc(prev => !prev);
  }, []);

  const toggleAnnotations = useCallback(() => {
    setShowAnnotations(prev => !prev);
  }, []);

  const toggleStickyToolbar = useCallback(() => {
    setIsToolbarSticky(prev => !prev);
  }, []);

  const createAnnotation = useCallback(async (type: 'highlight' | 'note' | 'bookmark', color: string = '#fbbf24', note?: string) => {
    if (!bookId || !loaded?.renderer) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentChapter = loaded.renderer.getCurrentChapter();
      
      let content = "";
      let cfi = "";
      
      if (type === 'highlight' || type === 'note') {
        content = selectedText;
        cfi = selectionCfi;
      } else if (type === 'bookmark') {
        content = currentChapter || "Bookmark";
        cfi = loaded.renderer.getCurrentCfi();
      }

      const { error } = await supabase
        .from('annotations')
        .insert({
          user_id: user.id,
          book_id: bookId,
          content,
          note: note || null,
          location: cfi,
          annotation_type: type,
          color
        });

      if (error) throw error;
      
      // Clear selection
      setSelectedText("");
      setSelectionCfi("");
      setShowAnnotationToolbar(false);
      window.getSelection()?.removeAllRanges();
      
    } catch (error) {
      console.error('Error creating annotation:', error);
    }
  }, [bookId, loaded, supabase, selectedText, selectionCfi]);

  const jumpToAnnotation = useCallback(async (location: string) => {
    if (!epubRendererRef.current || !location) return;
    
    const jumped = epubRendererRef.current.displayCfi(location);
    if (jumped) {
      setShowAnnotations(false);
    } else {
      console.warn('Failed to jump to annotation:', location);
    }
  }, []);

  const headerTitle = useMemo(() => {
    const t = loaded?.title || "EPUB";
    const a = loaded?.author ? ` — ${loaded.author}` : "";
    return `${t}${a}`;
  }, [loaded]);

  // Mouse event handlers for contextual UI
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!epubRendererRef.current) return;
      
      // Prevent default for our handled keys
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          epubRendererRef.current.previousPage();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ': // Space
          e.preventDefault();
          epubRendererRef.current.nextPage();
          break;
        case 'Home':
          e.preventDefault();
          containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'End':
          e.preventDefault();
          if (containerRef.current) {
            containerRef.current.scrollTo({ 
              top: containerRef.current.scrollHeight, 
              behavior: 'smooth' 
            });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation handlers
  const handleNextPage = useCallback(() => {
    epubRendererRef.current?.nextPage();
  }, []);

  const handlePreviousPage = useCallback(() => {
    epubRendererRef.current?.previousPage();
  }, []);

  const handleNextChapter = useCallback(() => {
    epubRendererRef.current?.nextChapter();
  }, []);

  const handlePreviousChapter = useCallback(() => {
    epubRendererRef.current?.previousChapter();
  }, []);

  // Touch handlers for mobile gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, [isMobile]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Only handle swipes that are quick and primarily horizontal
    if (deltaTime < 300 && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - previous page
        handlePreviousPage();
      } else {
        // Swipe left - next page
        handleNextPage();
      }
    }
    
    touchStartRef.current = null;
  }, [isMobile, handlePreviousPage, handleNextPage]);

  const showLoadingOverlay = isLoading && bookId;

  return (
    <div 
      className="min-h-dvh relative overflow-hidden bg-[rgb(var(--bg))] transition-colors duration-300"
    >
      {/* Premium gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent))]/5 via-transparent to-[rgb(var(--accent))]/3 opacity-20" />
      </div>
      
      {/* Hidden file input */}
      <input ref={inputRef} type="file" accept=".epub" className="hidden" onChange={onInputChange} />

      {/* Desktop Toolbar hover zone */}
      {!isMobile && !isToolbarSticky && (
        <div 
          className="fixed top-0 left-0 right-0 h-32 z-[70]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ pointerEvents: 'auto', background: 'transparent' }}
        />
      )}

      {/* Desktop Floating Header */}
      {!isMobile && (
        <div 
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[80] transition-elegant ${(isHovering || !loaded || isToolbarSticky) ? 'contextual show' : 'contextual'}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ pointerEvents: 'auto' }}
        >
        <div className="floating rounded-[var(--radius-xl)] px-6 py-3.5" style={{
          boxShadow: "0 25px 80px -12px rgba(0, 0, 0, 0.25), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))"
        }}>
          <div className="flex items-center gap-4">
            {!bookId && (
              <button 
                onClick={onPick} 
                className="btn-secondary px-4 py-2 text-sm font-medium"
              >
                Open EPUB
              </button>
            )}
            <button 
              onClick={() => router.push('/library')} 
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3L3 8l5 5" />
              </svg>
              Library
            </button>
            {loaded && (
              <>
                <div className="hidden sm:flex items-center gap-3">
                  <div className="h-5 w-[var(--space-hairline)] bg-[rgba(var(--border),var(--border-opacity))]" />
                  <div className="text-sm font-medium text-foreground max-w-xs truncate tracking-tight" title={headerTitle}>
                    {headerTitle}
                  </div>
                  <div className="h-5 w-[var(--space-hairline)] bg-[rgba(var(--border),var(--border-opacity))]" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Tooltip content="Pin toolbar">
                    <button 
                      onClick={toggleStickyToolbar} 
                      className={`btn-icon w-9 h-9 ${isToolbarSticky ? 'bg-[rgba(var(--accent),0.1)] text-[rgb(var(--accent))]' : ''}`}
                      aria-label="Pin toolbar"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 3v5l2-2 2 2V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
                        <path d="M8 11v3" />
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip content={theme === "dark" ? "Light mode" : "Dark mode"}>
                    <button 
                      onClick={onThemeToggle} 
                      className="btn-icon w-9 h-9"
                      aria-label="Toggle theme"
                    >
                      {theme === "dark" ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
                        </svg>
                      )}
                    </button>
                  </Tooltip>
                  {toc.length > 0 && (
                    <Tooltip content="Table of contents">
                      <button 
                        onClick={toggleToc} 
                        className="btn-icon w-9 h-9"
                        aria-label="Table of contents"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M2 4h12M2 8h12M2 12h12" />
                          <circle cx="2" cy="4" r="0.5" fill="currentColor" />
                          <circle cx="2" cy="8" r="0.5" fill="currentColor" />
                          <circle cx="2" cy="12" r="0.5" fill="currentColor" />
                        </svg>
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip content="Annotations">
                    <button 
                      onClick={toggleAnnotations} 
                      className="btn-icon w-9 h-9"
                      aria-label="Annotations"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m13.498 1 .002.002.002.002a2.5 2.5 0 0 1-.003 3.536L4.5 13.5l-4 1 1-4L10.5 1.5a2.5 2.5 0 0 1 3 0z" />
                        <path d="m10.5 4.5 2 2" />
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip content="Add bookmark">
                    <button 
                      onClick={() => createAnnotation('bookmark')} 
                      className="btn-icon w-9 h-9"
                      aria-label="Add bookmark"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                      </svg>
                    </button>
                  </Tooltip>
                  <div className="h-5 w-[var(--space-hairline)] bg-[rgba(var(--border),var(--border-opacity))]" />
                  <Tooltip content="Previous page (←)">
                    <button 
                      onClick={handlePreviousPage}
                      className="btn-icon w-9 h-9"
                      aria-label="Previous page"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.5 3.5L6 8l3.5 4.5" />
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip content="Next page (→)">
                    <button 
                      onClick={handleNextPage}
                      className="btn-icon w-9 h-9"
                      aria-label="Next page"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6.5 3.5L10 8l-3.5 4.5" />
                      </svg>
                    </button>
                  </Tooltip>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Floating TOC Sidebar */}
      {toc.length > 0 && (
        <div 
          className={`fixed left-6 top-1/2 -translate-y-1/2 z-40 w-[340px] max-h-[600px] transition-elegant ${showToc ? 'contextual show' : 'contextual'}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="floating rounded-[var(--radius-xl)] overflow-hidden flex flex-col" style={{
            boxShadow: "0 25px 80px -12px rgba(0, 0, 0, 0.25), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))"
          }}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(var(--border),var(--border-opacity))]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--radius)] bg-[rgba(var(--accent),0.1)] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[rgb(var(--accent))]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">Contents</h3>
                  <p className="text-xs text-muted font-medium">{toc.length} chapters</p>
                </div>
              </div>
              <button 
                onClick={toggleToc}
                className="btn-icon -mr-2"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="3" x2="11" y2="11" />
                  <line x1="11" y1="3" x2="3" y2="11" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4" style={{ maxHeight: "calc(600px - 80px)" }}>
              <div className="space-y-1">
                {toc.map((item, idx) => {
                  const isActive = chapterTitle && item.label.includes(chapterTitle);
                  return (
                    <button
                      key={`${item.href}-${idx}`}
                      onClick={() => onTocJump(item.href)}
                      className={`text-left w-full px-4 py-3 rounded-[var(--radius)] transition-all text-sm leading-relaxed group ${
                        isActive 
                          ? 'bg-[rgba(var(--accent),0.1)] text-[rgb(var(--accent))]' 
                          : 'hover:bg-[rgba(var(--muted),0.06)] text-foreground'
                      }`}
                      title={item.label}
                    >
                      <span className="line-clamp-2 font-medium group-hover:text-[rgb(var(--accent))]">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Toolbar */}
      {isMobile && loaded && (
        <div className="fixed bottom-0 left-0 right-0 z-[80] p-4 bg-gradient-to-t from-[rgb(var(--bg))] via-[rgb(var(--bg))]/95 to-transparent">
          <div className="floating rounded-[var(--radius-xl)] px-4 py-3" style={{
            boxShadow: "0 20px 60px -12px rgba(0, 0, 0, 0.3), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))"
          }}>
            <div className="flex items-center justify-between">
              {/* Left side - Navigation */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => router.push('/library')} 
                  className="btn-icon w-11 h-11"
                  aria-label="Library"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 16 16" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3L3 8l5 5" />
                  </svg>
                </button>
                <button 
                  onClick={handlePreviousPage}
                  className="btn-icon w-11 h-11"
                  aria-label="Previous page"
                >
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 3.5L6 8l3.5 4.5" />
                  </svg>
                </button>
                <button 
                  onClick={handleNextPage}
                  className="btn-icon w-11 h-11"
                  aria-label="Next page"
                >
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.5 3.5L10 8l-3.5 4.5" />
                  </svg>
                </button>
              </div>

              {/* Center - Progress */}
              <div className="flex-1 mx-4">
                <div className="relative">
                  <div className="h-2 bg-[rgba(var(--muted),0.1)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[rgb(var(--accent))] rounded-full transition-all duration-300"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                  <span className="absolute -top-6 right-0 text-xs font-medium tabular-nums text-muted">{currentProgress}%</span>
                </div>
              </div>

              {/* Right side - Tools */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={onThemeToggle} 
                  className="btn-icon w-11 h-11"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
                    </svg>
                  )}
                </button>
                {toc.length > 0 && (
                  <button 
                    onClick={toggleToc} 
                    className="btn-icon w-11 h-11"
                    aria-label="Table of contents"
                  >
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M2 4h12M2 8h12M2 12h12" />
                      <circle cx="2" cy="4" r="0.5" fill="currentColor" />
                      <circle cx="2" cy="8" r="0.5" fill="currentColor" />
                      <circle cx="2" cy="12" r="0.5" fill="currentColor" />
                    </svg>
                  </button>
                )}
                <button 
                  onClick={toggleAnnotations} 
                  className="btn-icon w-11 h-11"
                  aria-label="Annotations"
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m13.498 1 .002.002.002.002a2.5 2.5 0 0 1-.003 3.536L4.5 13.5l-4 1 1-4L10.5 1.5a2.5 2.5 0 0 1 3 0z" />
                    <path d="m10.5 4.5 2 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Reading Area */}
      <main className={`min-h-dvh flex items-start justify-center ${isMobile ? 'p-4 pb-24' : 'p-8'}`}>
        <div className="w-full max-w-5xl relative">
          {/* Chapter Title & Progress Overlay */}
          {chapterTitle && loaded && (
            <div 
              className={`fixed top-24 left-1/2 -translate-x-1/2 z-[70] transition-elegant ${isHovering ? 'contextual show' : 'contextual'}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="floating rounded-[var(--radius-xl)] px-8 py-5" style={{
                boxShadow: "0 20px 60px -12px rgba(0, 0, 0, 0.2), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))"
              }}>
                <h4 className="text-sm font-semibold text-center mb-4 tracking-tight text-foreground">{chapterTitle}</h4>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <div className="h-1.5 bg-[rgba(var(--muted),0.1)] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[rgb(var(--accent))] rounded-full transition-all duration-300"
                        style={{ width: `${currentProgress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium min-w-[3.5rem] text-center tabular-nums text-foreground">{currentProgress}%</span>
                </div>
              </div>
            </div>
          )}
          
          {/* EPUB Container - Clean scrollable container */}
          <div className="relative">
            <div
              ref={containerRef}
              className="card rounded-[var(--radius-2xl)] transition-all duration-300 relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{
                minHeight: "calc(100vh - 128px)",
                height: "calc(100vh - 128px)",
                maxWidth: "960px",
                margin: "0 auto",
                boxShadow: theme === "dark" 
                  ? "0 30px 90px -20px rgba(0, 0, 0, 0.6), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))" 
                  : "0 30px 90px -20px rgba(0, 0, 0, 0.15), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))",
                backgroundColor: theme === "dark" ? "#101215" : "#fcfcfd",
                overflowY: "auto",
                overflowX: "hidden",
                scrollBehavior: "smooth",
                WebkitOverflowScrolling: "touch"
              }}
            />
          </div>
        </div>
      </main>

      {/* Floating Status/Error Message */}
      {(error || (isHovering && loaded)) && (
        <div 
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] transition-elegant ${(error || (isHovering && loaded)) ? 'contextual show' : 'contextual'}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="floating rounded-[var(--radius-lg)] px-6 py-3.5" style={{
            boxShadow: "0 15px 50px -10px rgba(0, 0, 0, 0.2), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))"
          }}>
            {error ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                </div>
                <div className="text-red-500 text-sm font-medium">{error}</div>
              </div>
            ) : (
              <div className="flex items-center gap-6 text-muted text-sm font-medium">
                <span>← → Arrow keys to navigate • Space to scroll • Select text to highlight</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-[rgba(var(--bg),0.85)] backdrop-blur-xl flex items-center justify-center z-50">
          <div className="floating rounded-[var(--radius-2xl)] p-12 animate-scale-in" style={{
            boxShadow: "0 30px 90px -20px rgba(0, 0, 0, 0.3), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))"
          }}>
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-[var(--radius-lg)] bg-[rgba(var(--accent),0.1)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[rgb(var(--accent))]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto border-[3px] border-[rgba(var(--accent),0.2)] border-t-[rgb(var(--accent))] rounded-full animate-spin" />
                <p className="text-lg font-semibold tracking-tight text-foreground">Loading your book</p>
                <p className="text-sm text-muted font-medium">Preparing your reading experience...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Annotation Panel */}
      <AnnotationPanel
        bookId={bookId || ""}
        isOpen={showAnnotations}
        onClose={() => setShowAnnotations(false)}
        onJumpToAnnotation={jumpToAnnotation}
      />

      {/* Annotation Toolbar */}
      <AnnotationToolbar
        isVisible={showAnnotationToolbar}
        position={annotationToolbarPos}
        selectedText={selectedText}
        onHighlight={(color) => createAnnotation('highlight', color)}
        onNote={() => setShowNoteModal(true)}
        onBookmark={() => createAnnotation('bookmark')}
        onClose={() => {
          setShowAnnotationToolbar(false);
          setSelectedText("");
          setSelectionCfi("");
          window.getSelection()?.removeAllRanges();
        }}
      />

      {/* Note Modal */}
      {showNoteModal && (
        <NoteModal
          selectedText={selectedText}
          onSave={(note) => {
            createAnnotation('note', '#fde047', note);
            setShowNoteModal(false);
          }}
          onClose={() => setShowNoteModal(false)}
        />
      )}
    </div>
  );
}