"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import AnnotationPanel from "@/components/AnnotationPanel";

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
        spread: "auto"
      });

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

      // Note: Removed iframe access to prevent sandboxing security warnings

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

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!loaded?.rendition) return;
      if (e.key === "ArrowRight") {
        loaded.rendition.next();
      } else if (e.key === "ArrowLeft") {
        loaded.rendition.prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loaded]);

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

  const createAnnotation = useCallback(async (type: 'highlight' | 'note' | 'bookmark', color: string = '#fbbf24', note?: string) => {
    if (!bookId || !loaded?.rendition) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentLocation = await loaded.rendition.currentLocation();
      const cfi = currentLocation?.start?.cfi || "";
      
      let content = "";
      if (type === 'highlight' && selectedText) {
        content = selectedText;
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
          location: selectionCfi || cfi,
          annotation_type: type,
          color
        });

      if (error) throw error;
      
      // Clear selection
      setSelectedText("");
      setSelectionCfi("");
      
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
      style={{ background: theme === "dark" ? "#0d1117" : "#f8f9fa" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hidden file input */}
      <input ref={inputRef} type="file" accept=".epub" className="hidden" onChange={onInputChange} />

      {/* Floating Header - appears on hover */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-elegant ${(isHovering || !loaded) ? 'contextual show' : 'contextual'}`}>
        <div className="floating rounded-2xl px-6 py-3">
          <div className="flex items-center gap-4">
            {!bookId && (
              <button 
                onClick={onPick} 
                className="btn-secondary text-sm px-4 py-2"
              >
                Open EPUB
              </button>
            )}
            <button 
              onClick={() => router.push('/library')} 
              className="btn-secondary text-sm px-4 py-2"
            >
              Library
            </button>
            {loaded && (
              <>
                <div className="text-sm font-medium text-foreground max-w-xs truncate" title={headerTitle}>
                  {headerTitle}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={onPrev} 
                    className="w-8 h-8 rounded-full bg-surface hover:bg-surface-hover transition-elegant flex items-center justify-center text-sm"
                    aria-label="Previous page"
                  >
                    ←
                  </button>
                  <button 
                    onClick={onNext} 
                    className="w-8 h-8 rounded-full bg-surface hover:bg-surface-hover transition-elegant flex items-center justify-center text-sm"
                    aria-label="Next page"
                  >
                    →
                  </button>
                  <button 
                    onClick={onThemeToggle} 
                    className="w-8 h-8 rounded-full bg-surface hover:bg-surface-hover transition-elegant flex items-center justify-center text-sm"
                    aria-label="Toggle theme"
                  >
                    {theme === "dark" ? "🌙" : "☀️"}
                  </button>
                  {toc.length > 0 && (
                    <button 
                      onClick={toggleToc} 
                      className="w-8 h-8 rounded-full bg-surface hover:bg-surface-hover transition-elegant flex items-center justify-center text-sm"
                      aria-label="Table of contents"
                    >
                      ☰
                    </button>
                  )}
                  <button 
                    onClick={toggleAnnotations} 
                    className="w-8 h-8 rounded-full bg-surface hover:bg-surface-hover transition-elegant flex items-center justify-center text-sm"
                    aria-label="Annotations"
                  >
                    🖍️
                  </button>
                  <button 
                    onClick={() => createAnnotation('bookmark')} 
                    className="w-8 h-8 rounded-full bg-surface hover:bg-surface-hover transition-elegant flex items-center justify-center text-sm"
                    aria-label="Add bookmark"
                  >
                    🔖
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating TOC Sidebar */}
      {toc.length > 0 && (
        <div className={`fixed left-6 top-1/2 -translate-y-1/2 z-40 w-80 max-h-96 transition-elegant ${showToc ? 'contextual show' : 'contextual'}`}>
          <div className="floating rounded-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg text-foreground">Table of Contents</h3>
              <button 
                onClick={toggleToc}
                className="w-6 h-6 rounded-full bg-surface hover:bg-surface-hover transition-elegant flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto max-h-80 space-y-1">
              {toc.map((item, idx) => (
                <button
                  key={`${item.href}-${idx}`}
                  onClick={() => onTocJump(item.href)}
                  className="text-left w-full px-3 py-2 rounded-lg hover:bg-surface-hover transition-elegant text-sm leading-relaxed text-foreground"
                  title={item.label}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Reading Area */}
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="w-full max-w-4xl relative">
          {/* Chapter Title & Progress Overlay */}
          {chapterTitle && loaded && (
            <div className={`absolute -top-16 left-1/2 -translate-x-1/2 z-30 transition-elegant ${isHovering ? 'contextual show' : 'contextual'}`}>
              <div className="floating rounded-2xl px-6 py-3 space-y-2">
                <div className="text-sm font-medium text-center">{chapterTitle}</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 min-w-[120px]">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium min-w-[3rem] text-center">{currentProgress}%</span>
                </div>
              </div>
            </div>
          )}
          
          {/* EPUB Container */}
          <div
            ref={containerRef}
            className="w-full bg-surface rounded-3xl shadow-lg overflow-hidden transition-elegant"
            style={{
              height: "calc(100vh - 96px)",
              maxWidth: "900px",
              margin: "0 auto",
            }}
          />
          
          {/* Invisible click areas for navigation */}
          <button 
            onClick={onPrev} 
            className="absolute left-0 top-0 h-full w-1/4 opacity-0 z-20" 
            aria-label="Previous page" 
          />
          <button 
            onClick={onNext} 
            className="absolute right-0 top-0 h-full w-1/4 opacity-0 z-20" 
            aria-label="Next page" 
          />
        </div>
      </main>

      {/* Floating Status/Error Message */}
      {(error || isHovering) && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-elegant ${(error || isHovering) ? 'contextual show' : 'contextual'}`}>
          <div className="floating rounded-2xl px-6 py-3">
            {error ? (
              <div className="text-red-600 text-sm font-medium">{error}</div>
            ) : (
              <div className="text-muted text-sm">Double-click to toggle UI • Use arrow keys to navigate • Select text to highlight</div>
            )}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/30">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
              <p className="text-lg font-medium">Loading your book...</p>
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
    </div>
  );
}