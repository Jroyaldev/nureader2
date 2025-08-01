"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import AnnotationPanel from "@/components/AnnotationPanel";
import AnnotationToolbar from "@/components/AnnotationToolbar";
import NoteModal from "@/components/NoteModal";
import Tooltip from "@/components/Tooltip";

// Remove next/dynamic usage for non-component library; use on-demand import instead

// Lazy import note: epubjs is imported dynamically within loadFromFile to avoid SSR issues

interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

type LoadedBook = {
  book: any;
  rendition: any;
  title?: string;
  author?: string;
};

const defaultBookUrl = "/sample.epub";

export default function ReaderPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState<LoadedBook | null>(null);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // Removed showChrome as it's not used in the new floating UI design
  const [toc, setToc] = useState<TocItem[]>([]);
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [bookData, setBookData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionCfi, setSelectionCfi] = useState<string>("");
  const [readingStartTime, setReadingStartTime] = useState<number>(Date.now());
  const [totalReadingTime, setTotalReadingTime] = useState<number>(0);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [containerReady, setContainerReady] = useState<boolean>(false);
  const [annotationToolbar, setAnnotationToolbar] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    text: string;
    cfi: string;
  }>({ visible: false, position: { x: 0, y: 0 }, text: '', cfi: '' });
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    text: string;
    cfi: string;
    type: 'note' | 'highlight';
  } | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const bookId = searchParams.get('id');

  const getStorageKey = useCallback((identifier?: string) => {
    return identifier ? `arcadia:epub:cfi:${identifier}` : `arcadia:epub:cfi`;
  }, []);

  const applyTheme = useCallback((rendition: any, t: "light" | "dark") => {
    try {
      rendition.themes.register("light", {
        body: { background: "#ffffff", color: "#0b0b0c" },
        "::selection": { background: "#dbeafe" },
        a: { color: "#3b82f6" }
      });
      rendition.themes.register("dark", {
        body: { background: "#0b0b0c", color: "#f5f5f5" },
        "::selection": { background: "#334155" },
        a: { color: "#93c5fd" }
      });
      rendition.themes.select(t);
    } catch {
      // noop
    }
  }, []);

  const saveReadingProgress = useCallback(async (cfi: string, rendition?: any) => {
    // Skip database operations for now due to RLS 406 errors
    // Just save to localStorage as backup
    if (!bookData || !bookId) return;
    
    try {
      // Save to localStorage only for now
      const meta = await (loaded?.book?.loaded?.metadata || Promise.resolve({}));
      const id = meta?.identifier || bookData.title;
      const key = getStorageKey(id);
      
      if (typeof window !== "undefined" && cfi) {
        window.localStorage.setItem(key, cfi);
      }
    } catch (error) {
      console.warn('Error saving reading progress to localStorage:', error);
    }
  }, [bookData, bookId, loaded, getStorageKey]);

  const loadFromFile = useCallback(async (file: File) => {
    setError("");
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Dynamically import epubjs only on the client
      const mod = await import("epubjs");
      const EpubCtor = mod?.default ?? mod;
      
      const book = new (EpubCtor as any)(arrayBuffer);

      if (!containerRef.current) {
        // Wait for the next tick to allow DOM to render
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!containerRef.current) {
          setError("Reader container not ready");
          return;
        }
      }
      
      const rendition = book.renderTo(containerRef.current, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: "auto",
        allowScriptedContent: true
      });

      // Configure iframe sandbox to allow scripts and text selection
      setTimeout(() => {
        const iframes = containerRef.current?.querySelectorAll('iframe');
        iframes?.forEach(iframe => {
          iframe.sandbox.add('allow-scripts');
          iframe.sandbox.add('allow-same-origin');
          iframe.sandbox.add('allow-pointer-lock');
        });
      }, 100);

      applyTheme(rendition, theme);

      // Restore last CFI from localStorage for now (skip database due to RLS issues)
      let displayTarget: string | undefined = undefined;
      try {
        // Use localStorage until RLS issues are resolved
        const id = (await book.loaded.metadata)?.identifier || file.name;
        const key = getStorageKey(id);
        const saved = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
        if (saved) displayTarget = saved;
      } catch {}

      try {
        await rendition.display(displayTarget);
      } catch (error) {
        console.warn('Failed to display saved position, starting from beginning:', error);
        await rendition.display(); // Display first page if saved position fails
      }
      
      // Load and restore existing highlights
      await loadExistingHighlights(rendition);

      // Extract metadata
      let title: string | undefined;
      let author: string | undefined;
      try {
        const meta = await book.loaded.metadata;
        title = meta?.title;
        author = meta?.creator || meta?.author;
      } catch {
        // ignore
      }

      // Table of contents
      try {
        const nav = await book.loaded.navigation;
        const flat: Array<{ label: string; href: string }> = [];
        const walk = (items: TocItem[]) => {
          for (const it of items || []) {
            if (it?.label && it?.href) flat.push({ label: it.label, href: it.href });
            if (it?.subitems?.length) walk(it.subitems);
          }
        };
        walk(nav?.toc || []);
        setToc(flat);
      } catch {}

      // Update chapter title and progress on relocate
      rendition.on("relocated", (location: { start: { displayed: { chapterName: string }, percentage: number } }) => {
        try {
          setChapterTitle(location?.start?.displayed?.chapterName || "");
          if (location?.start?.percentage !== undefined) {
            setCurrentProgress(Math.round(location.start.percentage * 100));
          }
        } catch {}
      });

      // Text selection handling for annotations
      rendition.on("selected", async (cfiRange: string, contents: any) => {
        console.log('📝 Text selected event fired:', { cfiRange, contents });
        try {
          const selection = contents.window.getSelection();
          console.log('📝 Selection object:', selection, 'Text:', selection?.toString());
          
          if (selection && selection.toString().trim()) {
            const selectedText = selection.toString().trim();
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const containerRect = containerRef.current?.getBoundingClientRect();
            
            console.log('📝 Selection rect:', rect, 'Container rect:', containerRect);
            
            if (containerRect) {
              // Calculate position relative to viewport, not container
              const x = rect.left + rect.width / 2;
              const y = rect.top;
              
              console.log('📝 Setting annotation toolbar at:', { x, y });
              
              setAnnotationToolbar({
                visible: true,
                position: { x, y },
                text: selectedText,
                cfi: cfiRange
              });
              
              setSelectedText(selectedText);
              setSelectionCfi(cfiRange);
            }
          }
        } catch (error) {
          console.error('Error handling text selection:', error);
        }
      });
      
      // Hide annotation toolbar when selection is cleared
      rendition.on("click", () => {
        setAnnotationToolbar({ visible: false, position: { x: 0, y: 0 }, text: '', cfi: '' });
      });
      
      // Also listen for selection cleared events
      rendition.on("unselected", () => {
        setAnnotationToolbar({ visible: false, position: { x: 0, y: 0 }, text: '', cfi: '' });
      });

      // Persist CFI periodically to both database and localStorage
      const persist = async () => {
        try {
          const cfi = await rendition.currentLocation();
          const meta = await book.loaded.metadata;
          const id = meta?.identifier || file.name;
          const key = getStorageKey(id);
          const value = cfi?.start?.cfi || cfi?.end?.cfi;
          
          if (value) {
            // Save to localStorage as backup
            if (typeof window !== "undefined") {
              window.localStorage.setItem(key, value);
            }
            
            // Save to database if we have book data
            await saveReadingProgress(value, rendition);
          }
        } catch (error) {
          console.warn('Failed to persist reading progress:', error);
        }
      };
      rendition.on("relocated", persist);

      setLoaded({ book, rendition, title, author });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load EPUB. Please try a different file.";
      console.error('❌ EPUB loading failed:', err);
      setError(errorMessage);
    }
  }, [applyTheme, theme, getStorageKey, saveReadingProgress, bookId]);

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
  }, []);

  // Monitor container readiness
  useEffect(() => {
    const checkContainer = () => {
      if (containerRef.current) {
        setContainerReady(true);
      }
    };
    
    // Check immediately
    checkContainer();
    
    // Also check after a small delay to ensure DOM is fully rendered
    const timeout = setTimeout(checkContainer, 100);
    
    return () => clearTimeout(timeout);
  }, []);

  // Load book from Supabase if book ID is provided
  useEffect(() => {
    const loadBookFromDatabase = async () => {
      if (!bookId) {
        setIsLoading(false);
        return;
      }

      // Don't reload if book is already loaded
      if (loaded) {
        return;
      }

      // Wait for auth and container to be ready
      if (!authReady || !containerReady) {
        return;
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push('/login');
          return;
        }

        // Get book metadata
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

        // Download EPUB file from storage
        const { data: fileData, error: storageError } = await supabase.storage
          .from('epub-files')
          .download(book.file_path);

        if (storageError || !fileData) {
          setError("Failed to load book file");
          setIsLoading(false);
          return;
        }

        // Create file object and load it
        const file = new File([fileData], book.title + '.epub', { type: 'application/epub+zip' });
        await loadFromFile(file);
        
      } catch (err) {
        console.error('❌ Error loading book:', err);
        setError("Failed to load book");
      } finally {
        setIsLoading(false);
      }
    };

    loadBookFromDatabase();
  }, [bookId, authReady, containerReady, router]);

  // Detect prefers-color-scheme for initial theme
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setTheme(mq.matches ? "dark" : "light");
      const listener = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
      mq.addEventListener?.("change", listener);
      return () => mq.removeEventListener?.("change", listener);
    }
  }, []);

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
    // Only load default sample if no book ID is provided and not loading
    if (!loaded && !bookId && !isLoading) {
      void loadDefault();
    }
  }, [loaded, loadDefault, bookId, isLoading]);

  // Keyboard navigation and shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!loaded?.rendition) return;
      
      // Don't interfere with form inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Navigation
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        loaded.rendition.next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        loaded.rendition.prev();
      }
      
      // Annotation shortcuts
      else if (e.key === "h" && selectedText) {
        // Quick highlight with default color
        // TODO: Add keyboard shortcut for highlighting
      } else if (e.key === "n" && selectedText) {
        // Quick note
        // TODO: Add keyboard shortcut for notes
      } else if (e.key === "b") {
        // Quick bookmark
        // TODO: Add keyboard shortcut for bookmarks
      }
      
      // UI shortcuts
      else if (e.key === "t") {
        // Toggle table of contents
        setShowToc(prev => !prev);
      } else if (e.key === "a") {
        // Toggle annotations panel
        setShowAnnotations(prev => !prev);
      } else if (e.key === "Escape") {
        // Close any open panels/toolbars
        // TODO: Add toolbar close functionality
        setShowToc(false);
        setShowAnnotations(false);
      }
    };
    
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loaded, selectedText, selectionCfi]);

  // Apply theme when system toggles or after loading
  useEffect(() => {
    if (loaded?.rendition) applyTheme(loaded.rendition, theme);
  }, [loaded, theme, applyTheme]);

  const onPrev = useCallback(() => loaded?.rendition?.prev(), [loaded]);
  const onNext = useCallback(() => loaded?.rendition?.next(), [loaded]);
  const onThemeToggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  const onTocJump = useCallback(async (href: string) => {
    try {
      await loaded?.rendition?.display(href);
      setShowToc(false);
    } catch {}
  }, [loaded]);

  const toggleToc = useCallback(() => {
    setShowToc(prev => !prev);
  }, []);

  const toggleAnnotations = useCallback(() => {
    setShowAnnotations(prev => !prev);
  }, []);

  const createAnnotation = useCallback(async (type: 'highlight' | 'note' | 'bookmark', color: string = '#fbbf24', note?: string, customText?: string, customCfi?: string) => {
    if (!bookId || !loaded?.rendition) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentLocation = await loaded.rendition.currentLocation();
      const cfi = customCfi || selectionCfi || currentLocation?.start?.cfi || "";
      
      let content = "";
      if (type === 'highlight' && (customText || selectedText)) {
        content = customText || selectedText;
      } else if (type === 'note' && (customText || selectedText)) {
        content = customText || selectedText;
      } else if (type === 'bookmark') {
        content = chapterTitle || "Bookmark";
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
      
      // Apply highlight to the rendition if it's a highlight
      if (type === 'highlight' && cfi) {
        loaded.rendition.annotations.add("highlight", cfi, {}, undefined, "epub-highlight", {
          "background-color": color,
          "border-radius": "3px",
          "padding": "2px 0"
        });
      }
      
      // Clear selection and toolbar
      setSelectedText("");
      setSelectionCfi("");
      setAnnotationToolbar({ visible: false, position: { x: 0, y: 0 }, text: '', cfi: '' });
      
    } catch (error) {
      console.error('Error creating annotation:', error);
    }
  }, [bookId, loaded, selectedText, selectionCfi, chapterTitle, supabase]);

  const jumpToAnnotation = useCallback(async (location: string) => {
    if (!loaded?.rendition) return;
    try {
      await loaded.rendition.display(location);
    } catch (error) {
      console.error('Error jumping to annotation:', error);
    }
  }, [loaded]);
  
  // Annotation toolbar handlers
  const handleHighlight = useCallback((color: string) => {
    createAnnotation('highlight', color, undefined, annotationToolbar.text, annotationToolbar.cfi);
  }, [createAnnotation, annotationToolbar]);
  
  const handleNote = useCallback(() => {
    setPendingAnnotation({
      text: annotationToolbar.text,
      cfi: annotationToolbar.cfi,
      type: 'note'
    });
    setShowNoteModal(true);
    setAnnotationToolbar({ visible: false, position: { x: 0, y: 0 }, text: '', cfi: '' });
  }, [annotationToolbar]);
  
  const handleBookmark = useCallback(() => {
    createAnnotation('bookmark');
  }, [createAnnotation]);
  
  const handleCloseToolbar = useCallback(() => {
    setAnnotationToolbar({ visible: false, position: { x: 0, y: 0 }, text: '', cfi: '' });
    setSelectedText("");
    setSelectionCfi("");
  }, []);
  
  const handleSaveNote = useCallback((note: string, highlightColor?: string) => {
    if (!pendingAnnotation) return;
    
    if (highlightColor) {
      // Create both highlight and note
      createAnnotation('highlight', highlightColor, undefined, pendingAnnotation.text, pendingAnnotation.cfi);
    }
    
    createAnnotation('note', '#3b82f6', note, pendingAnnotation.text, pendingAnnotation.cfi);
    
    setShowNoteModal(false);
    setPendingAnnotation(null);
  }, [pendingAnnotation, createAnnotation]);
  
  const handleCancelNote = useCallback(() => {
    setShowNoteModal(false);
    setPendingAnnotation(null);
  }, []);
  
  // Load existing highlights from database
  const loadExistingHighlights = useCallback(async (rendition: any) => {
    if (!bookId || !authReady) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: highlights, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('annotation_type', 'highlight');
        
      if (error) throw error;
      
      // Apply each highlight to the rendition
      highlights?.forEach((highlight) => {
        if (highlight.location && highlight.color) {
          rendition.annotations.add("highlight", highlight.location, {}, undefined, "epub-highlight", {
            "background-color": highlight.color,
            "border-radius": "3px",
            "padding": "2px 0",
            "cursor": "pointer"
          });
        }
      });
      
    } catch (error) {
      console.warn('Error loading existing highlights:', error);
    }
  }, [bookId, authReady, supabase]);
  
  // Refresh highlights when annotations change
  useEffect(() => {
    if (loaded?.rendition && bookId && authReady) {
      // Small delay to ensure rendition is ready
      setTimeout(() => {
        loadExistingHighlights(loaded.rendition);
      }, 1000);
    }
  }, [loaded, bookId, authReady, loadExistingHighlights]);

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
    }, 1000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Show loading overlay instead of replacing entire component
  const showLoadingOverlay = isLoading && bookId;

  return (
    <div 
      className="min-h-dvh relative overflow-hidden transition-elegant"
      style={{ background: theme === "dark" ? "#0a0a0a" : "#fefefe" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hidden file input */}
      <input ref={inputRef} type="file" accept=".epub" className="hidden" onChange={onInputChange} />

      {/* Floating Header - appears on hover */}
      <div className={`fixed top-2 md:top-4 left-1/2 -translate-x-1/2 z-[100] transition-elegant ${(isHovering || !loaded) ? 'contextual show' : 'contextual'}`}>
        <div className="floating-premium rounded-xl md:rounded-2xl px-3 md:px-5 py-2 md:py-2.5">
          <div className="flex items-center gap-2 md:gap-3">
            {!bookId && (
              <Tooltip content="Open EPUB file" position="bottom">
                <button 
                  onClick={onPick} 
                  className="btn-secondary text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5"
                >
                  <span className="hidden sm:inline">Open EPUB</span>
                  <span className="sm:hidden">Open</span>
                </button>
              </Tooltip>
            )}
            <Tooltip content="Back to library" position="bottom">
              <button 
                onClick={() => router.push('/library')} 
                className="btn-secondary text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5"
              >
                <span className="hidden sm:inline">Library</span>
                <span className="sm:hidden">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 1v6m8-6v6" />
                  </svg>
                </span>
              </button>
            </Tooltip>
            {loaded && (
              <>
                <div className="text-xs md:text-sm font-semibold text-foreground max-w-[8rem] sm:max-w-sm truncate" title={headerTitle}>
                  {headerTitle}
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip content="Previous page (←)" position="bottom">
                    <button 
                      onClick={onPrev} 
                      className="control-btn"
                      aria-label="Previous page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip content="Next page (→)" position="bottom">
                    <button 
                      onClick={onNext} 
                      className="control-btn"
                      aria-label="Next page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </Tooltip>
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
                  <Tooltip content={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} position="bottom">
                    <button 
                      onClick={onThemeToggle} 
                      className="control-btn"
                      aria-label="Toggle theme"
                    >
                      {theme === "dark" ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      )}
                    </button>
                  </Tooltip>
                  {toc.length > 0 && (
                    <Tooltip content="Table of contents" position="bottom">
                      <button 
                        onClick={toggleToc} 
                        className="control-btn"
                        aria-label="Table of contents"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip content="View annotations and highlights" position="bottom">
                    <button 
                      onClick={toggleAnnotations} 
                      className="control-btn"
                      aria-label="Annotations"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7H3a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip content="Add bookmark at current location" position="bottom">
                    <button 
                      onClick={() => createAnnotation('bookmark')} 
                      className="control-btn"
                      aria-label="Add bookmark"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip content="Test annotation toolbar" position="bottom">
                    <button 
                      onClick={() => {
                        console.log('🧪 Testing annotation toolbar');
                        setAnnotationToolbar({
                          visible: true,
                          position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
                          text: 'Test selected text for annotation toolbar',
                          cfi: 'test-cfi'
                        });
                      }}
                      className="control-btn bg-yellow-500/20 hover:bg-yellow-500/30"
                      aria-label="Test annotation toolbar"
                    >
                      🧪
                    </button>
                  </Tooltip>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating TOC Sidebar */}
      {toc.length > 0 && (
        <div className={`fixed left-2 md:left-4 top-1/2 -translate-y-1/2 z-[90] w-[calc(100vw-1rem)] max-w-80 md:w-80 max-h-[75vh] transition-elegant ${showToc ? 'contextual show' : 'contextual'}`}>
          <div className="floating-premium rounded-xl md:rounded-2xl p-4 md:p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base text-foreground">Contents</h3>
              <Tooltip content="Close table of contents" position="left">
                <button 
                  onClick={toggleToc}
                  className="control-btn p-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Tooltip>
            </div>
            <div className="overflow-y-auto max-h-[60vh] space-y-1 -mx-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {toc.map((item, idx) => (
                <button
                  key={`${item.href}-${idx}`}
                  onClick={() => onTocJump(item.href)}
                  className="toc-item group text-left w-full px-3 py-2.5 rounded-lg transition-all duration-200 text-sm leading-relaxed text-foreground border-l-3 border-transparent relative overflow-hidden"
                  title={item.label}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <div className="relative z-10 truncate">
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Reading Area */}
      <main className="min-h-dvh flex items-center justify-center p-0 md:p-6">
        <div className="w-full max-w-5xl relative">
          {/* Chapter Title & Progress Overlay */}
          {chapterTitle && loaded && (
            <div className={`absolute -top-12 md:-top-14 left-1/2 -translate-x-1/2 z-[80] transition-elegant ${isHovering ? 'contextual show' : 'contextual'}`}>
              <div className="floating-premium rounded-lg md:rounded-xl px-3 md:px-5 py-2 md:py-2.5 space-y-1.5 md:space-y-2">
                <div className="text-xs md:text-sm font-medium text-center truncate max-w-[12rem] md:max-w-xs">{chapterTitle}</div>
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="flex-1 bg-gray-200/80 dark:bg-gray-700/80 rounded-full h-1 md:h-1.5 min-w-[100px] md:min-w-[140px]">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 h-1 md:h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold min-w-[2.5rem] md:min-w-[3rem] text-center tabular-nums">{currentProgress}%</span>
                </div>
              </div>
            </div>
          )}
          
          {/* EPUB Container */}
          <div
            ref={containerRef}
            className="w-full bg-white dark:bg-gray-900 md:rounded-2xl lg:rounded-3xl shadow-none md:shadow-xl lg:shadow-2xl overflow-hidden transition-elegant border-0 md:border border-gray-200/50 dark:border-gray-700/50 relative z-10"
            style={{
              height: "100vh",
              maxWidth: "100vw",
              margin: "0 auto",
            }}
          />
          
          {/* Invisible click areas for navigation */}
          <button 
            onClick={onPrev} 
            className="absolute left-0 top-0 h-full w-1/3 md:w-1/4 opacity-0 z-20" 
            aria-label="Previous page" 
          />
          <button 
            onClick={onNext} 
            className="absolute right-0 top-0 h-full w-1/3 md:w-1/4 opacity-0 z-20" 
            aria-label="Next page" 
          />
        </div>
      </main>

      {/* Floating Status/Error Message */}
      {(error || isHovering) && (
        <div className={`fixed bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 z-[70] transition-elegant ${(error || isHovering) ? 'contextual show' : 'contextual'}`}>
          <div className="floating-premium rounded-lg md:rounded-xl px-3 md:px-4 py-1.5 md:py-2 mx-2">
            {error ? (
              <div className="text-red-600 dark:text-red-400 text-xs md:text-sm font-medium">{error}</div>
            ) : (
              <div className="text-muted text-xs text-center max-w-xs md:max-w-md">
                <span className="hidden md:inline">Use arrow keys or click edges to navigate • Select text to highlight • Press space for page down</span>
                <span className="md:hidden">Tap edges or swipe to navigate • Tap and hold to highlight</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-[110]">
          <div className="floating-premium rounded-xl md:rounded-2xl p-6 md:p-8 shadow-2xl max-w-xs md:max-w-sm mx-4">
            <div className="text-center space-y-3 md:space-y-4">
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto border-3 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
              <p className="text-sm md:text-base font-semibold">Loading your book...</p>
              <p className="text-xs md:text-sm text-muted hidden md:block">Please wait while we prepare your reading experience</p>
            </div>
          </div>
        </div>
      )}

      {/* Annotation Toolbar */}
      <AnnotationToolbar
        isVisible={annotationToolbar.visible}
        position={annotationToolbar.position}
        selectedText={annotationToolbar.text}
        onHighlight={handleHighlight}
        onNote={handleNote}
        onBookmark={handleBookmark}
        onClose={handleCloseToolbar}
      />
      
      {/* Note Modal */}
      <NoteModal
        isOpen={showNoteModal}
        selectedText={pendingAnnotation?.text || ''}
        onSave={handleSaveNote}
        onCancel={handleCancelNote}
      />
      
      {/* Annotation Panel */}
      <AnnotationPanel
        bookId={bookId || ""}
        isOpen={showAnnotations}
        onClose={() => setShowAnnotations(false)}
        onJumpToAnnotation={jumpToAnnotation}
      />
    </div>
  );
}