"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import AnnotationPanel from "@/components/AnnotationPanel";
import Tooltip from "@/components/TooltipImproved";

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
        body: { 
          background: "#ffffff", 
          color: "#1c2024",
          fontFamily: "var(--font-geist-sans), -apple-system, system-ui, sans-serif",
          fontSize: "17px",
          lineHeight: "1.7",
          letterSpacing: "-0.003em"
        },
        "::selection": { background: "rgba(0, 113, 227, 0.15)" },
        a: { color: "#0071e3", textDecoration: "none" },
        "a:hover": { textDecoration: "underline" }
      });
      rendition.themes.register("dark", {
        body: { 
          background: "#1a1c20", 
          color: "#f5f5f7",
          fontFamily: "var(--font-geist-sans), -apple-system, system-ui, sans-serif",
          fontSize: "17px",
          lineHeight: "1.7",
          letterSpacing: "-0.003em"
        },
        "::selection": { background: "rgba(64, 156, 255, 0.3)" },
        a: { color: "#409cff", textDecoration: "none" },
        "a:hover": { textDecoration: "underline" }
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
      className="min-h-dvh relative overflow-hidden bg-[rgb(var(--bg))]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Premium gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent))]/5 via-transparent to-[rgb(var(--accent))]/3 opacity-20" />
      </div>
      
      {/* Hidden file input */}
      <input ref={inputRef} type="file" accept=".epub" className="hidden" onChange={onInputChange} />

      {/* Floating Header - Premium navigation bar */}
      <div 
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[80] transition-elegant ${(isHovering || !loaded) ? 'contextual show' : 'contextual'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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
                  <Tooltip content="Previous page">
                    <button 
                      onClick={onPrev} 
                      className="btn-icon w-9 h-9"
                      aria-label="Previous page"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="10 4 6 8 10 12" />
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip content="Next page">
                    <button 
                      onClick={onNext} 
                      className="btn-icon w-9 h-9"
                      aria-label="Next page"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 4 10 8 6 12" />
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
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="3" y1="4" x2="13" y2="4" />
                          <line x1="3" y1="8" x2="13" y2="8" />
                          <line x1="3" y1="12" x2="13" y2="12" />
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
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.5 1a2.5 2.5 0 0 1 0 5l-8 8-3.5.5.5-3.5 8-8a2.5 2.5 0 0 1 3 0z" />
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
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating TOC Sidebar - Premium design */}
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

      {/* Main Reading Area */}
      <main className="min-h-dvh flex items-center justify-center p-8">
        <div className="w-full max-w-5xl relative">
          {/* Chapter Title & Progress Overlay - Premium design */}
          {chapterTitle && loaded && (
            <div 
              className={`absolute -top-24 left-1/2 -translate-x-1/2 z-[70] transition-elegant ${isHovering ? 'contextual show' : 'contextual'}`}
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
          
          {/* EPUB Container - Premium academic design */}
          <div className="relative">
            {/* Premium gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent))]/5 via-transparent to-[rgb(var(--accent))]/3 opacity-10 rounded-[var(--radius-2xl)]" />
            
            <div
              ref={containerRef}
              className="card rounded-[var(--radius-2xl)] overflow-hidden transition-elegant relative"
              style={{
                height: "calc(100vh - 128px)",
                maxWidth: "960px",
                margin: "0 auto",
                boxShadow: theme === "dark" 
                  ? "0 30px 90px -20px rgba(0, 0, 0, 0.6), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))" 
                  : "0 30px 90px -20px rgba(0, 0, 0, 0.15), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))",
              }}
            />
          </div>
          
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

      {/* Floating Status/Error Message - Premium design */}
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
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-0.5 text-xs bg-[rgba(var(--muted),0.1)] rounded border border-[rgba(var(--border),var(--border-opacity))]">&larr;</kbd>
                  <kbd className="px-2 py-0.5 text-xs bg-[rgba(var(--muted),0.1)] rounded border border-[rgba(var(--border),var(--border-opacity))]">&rarr;</kbd>
                  <span>Navigate</span>
                </div>
                <div className="h-4 w-[var(--space-hairline)] bg-[rgba(var(--border),var(--border-opacity))]" />
                <span>Select text to highlight</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Overlay - Premium design */}
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
    </div>
  );
}
