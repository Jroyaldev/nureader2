"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import AnnotationPanel from "@/components/AnnotationPanel";
import AnnotationToolbar from "@/components/AnnotationToolbar";
import NotePopover from "@/components/reader/NotePopover";
import NoteMobileModal from "@/components/reader/NoteMobileModal";
import { Toast } from "@/components/ui/Toast/Toast";
import { useTheme } from "@/providers/ThemeProvider";
import { EpubRenderer } from "@/lib/epub-renderer";
import { SavedPosition } from "@/lib/position-manager";
import TableOfContents from "@/components/reader/TableOfContents";
import ContextualToolbar from "@/components/reader/ContextualToolbar";
import MobileToolbar from "@/components/reader/MobileToolbar";
import SearchPanel from "@/components/reader/SearchPanel";
import { EnhancedSettingsPanel, SimplifiedReadingSettings } from "@/components/reader/EnhancedSettingsPanel";
import { useReaderState } from '@/hooks/useReaderState';
import EnhancedAIAssistant from "@/components/reader/EnhancedAIAssistant";
import { useSidebar, UIStateProvider } from '@/contexts/UIStateContext';


const defaultBookUrl = "/sample.epub";

function ReaderPageContent() {
  const {
    containerRef,
    epubRendererRef,
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
    setUserTheme,
  } = useReaderState();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const theme = resolvedTheme; // Use global theme preference
  
  // Sidebar management with centralized state
  const tocSidebar = useSidebar('toc');
  const annotationsSidebar = useSidebar('annotations');
  const settingsSidebar = useSidebar('settings');
  const searchSidebar = useSidebar('search');
  const aiSidebar = useSidebar('ai');
  
  // UI state
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [bookData, setBookData] = useState<any>(null);
  const [savedProgress, setSavedProgress] = useState<{location: string, percentage: number} | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [containerReady, setContainerReady] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const saveProgressQueueRef = useRef<{ progress: number; timestamp: number } | null>(null);
  const saveProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reading settings state - initialize with current theme
  const [readingSettings, setReadingSettings] = useState<SimplifiedReadingSettings>(() => ({
    fontSize: 16,
    fontFamily: 'system-ui',
    lineHeight: 1.6,
    letterSpacing: 0,
    textAlign: 'left',
    marginHorizontal: 40,
    marginVertical: 40,
    maxWidth: 0,
    theme: (resolvedTheme || 'light') as any,
    brightness: 100,
    contrast: 100,
    autoHideToolbar: true,
    readingSpeed: 250
  }));
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const bookId = searchParams.get('id');

  // The scroll tracking is now handled by EpubRenderer internally
  // This avoids duplicate scroll handlers and ensures consistency

  // Update navigation state and reading time when chapter or progress changes
  useEffect(() => {
    if (!toc.length || !chapterTitle) return;
    
    const chapterIndex = toc.findIndex(item => item.label === chapterTitle);
    if (chapterIndex !== -1) {
      setNavigationState({
        canGoNext: chapterIndex < toc.length - 1,
        canGoPrev: chapterIndex > 0,
      });
    }
    
    // Calculate reading time
    if (epubRendererRef.current && loaded) {
      const readingSpeed = readingSettings.readingSpeed || 250;
      const timeData = epubRendererRef.current.calculateReadingTime(readingSpeed);
      const formattedTime = EpubRenderer.formatReadingTime(timeData.remainingTime);
      setTimeLeft(formattedTime);
    }
  }, [chapterTitle, toc, currentProgress, loaded, readingSettings.readingSpeed]);

  // Clean up renderer on unmount or book change
  useEffect(() => {
    return () => {
      if (epubRendererRef.current) {
        console.log('🧹 Cleaning up EPUB renderer');
        epubRendererRef.current.destroy();
        epubRendererRef.current = null;
      }
    };
  }, [bookId]); // Also cleanup when bookId changes

  // Listen for annotation click events from the renderer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleAnnotationClick = (e: CustomEvent) => {
      const annotation = e.detail;
      if (annotation) {
        setShowAnnotations(true);
      }
    };

    container.addEventListener('annotationClick', handleAnnotationClick as EventListener);

    return () => {
      container.removeEventListener('annotationClick', handleAnnotationClick as EventListener);
    };
  }, [containerReady]);

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

      // Create new epub renderer with initial theme to prevent flash
      const renderer = new EpubRenderer(containerRef.current, theme);
      epubRendererRef.current = renderer;

      // Connect progress and chapter callbacks
      renderer.onProgress((progress) => {
        setCurrentProgress(progress);
      });

      renderer.onChapterChange((title) => {
        setChapterTitle(title);
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
          
          // Calculate position relative to viewport, not document
          // This ensures the toolbar appears at the correct position even when scrolled
          setAnnotationToolbarPos({
            x: rect.left + rect.width / 2,
            y: rect.top - 10 // Position above selection, not using scrollY
          });
          setShowAnnotationToolbar(true);
        }
      });

      // Load the book
      const { title, author } = await renderer.loadBook(file);

      // Get table of contents
      const tocItems = renderer.getTableOfContents();
      setToc(tocItems);
      
      // Set initial chapter
      const initialChapter = renderer.getCurrentChapter();
      if (initialChapter) {
        setChapterTitle(initialChapter);
      }

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
  }, []);

  // Monitor auth state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthReady(!!session);
        setCurrentUserId(session?.user?.id || null);
      } catch {
        setAuthReady(false);
        setCurrentUserId(null);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthReady(!!session);
      setCurrentUserId(session?.user?.id || null);
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

  // Load annotations for the book (race-proof)
  const loadAnnotations = useCallback(async (renderer?: EpubRenderer) => {
    const r = renderer ?? epubRendererRef.current;
    if (!bookId || !r) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: annotations, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      if (!error && annotations) {
        // Bail if renderer changed/destroyed while awaiting
        if (!r || r !== epubRendererRef.current) return;

        const formattedAnnotations = annotations
          .filter(a => {
            // Filter out annotations with invalid content
            if (!a.content || typeof a.content !== 'string' || a.content.trim().length < 3) {
              console.warn(`⚠️ Filtering out annotation ${a.id}: invalid content:`, {
                content: a.content,
                type: typeof a.content,
                length: a.content ? a.content.length : 0
              });
              return false;
            }
            return true;
          })
          .map(a => ({
            id: a.id,
            location: a.location,
            content: a.content,
            color: a.color,
            annotation_type: a.annotation_type,
            note: a.note
          }));

        r.loadAnnotations(formattedAnnotations);
        
        // Check if current location has a bookmark
        const currentCfi = r.getCurrentCfi();
        const hasBookmark = annotations.some(a => 
          a.annotation_type === 'bookmark' && 
          a.location === currentCfi
        );
        setIsBookmarked(hasBookmark);
        
        console.log(`✅ Loaded ${annotations.length} annotations`);
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
    }
  }, [bookId, supabase]);

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

        // Load saved reading progress BEFORE loading the book
        let savedLocation: string | null = null;
        let savedPercentage: number = 0;
        
        try {
          console.log('📖 Loading reading progress for book:', bookId);
          
          const { data: progress, error: progressError } = await supabase
            .from('reading_progress')
            .select(`
              current_location, 
              progress_percentage, 
              reading_time_minutes,
              last_read_at
            `)
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .single();
          
          if (!progressError && progress) {
            console.log('✅ Found saved progress:', progress.progress_percentage + '%');
            savedLocation = progress.current_location;
            savedPercentage = progress.progress_percentage;
            setSavedProgress({
              location: progress.current_location,
              percentage: progress.progress_percentage
            });
            setCurrentProgress(progress.progress_percentage);
          }
        } catch (err) {
          console.warn('Could not load saved progress:', err);
        }

        const { data: fileData, error: storageError } = await supabase.storage
          .from('epub-files')
          .download(book.file_path);

        if (storageError || !fileData) {
          setError("Failed to load book file");
          setIsLoading(false);
          return;
        }

        // Hide container initially if we have saved progress to restore
        const hasPositionToRestore = savedLocation || savedPercentage > 0;
        if (hasPositionToRestore && containerRef.current) {
          containerRef.current.style.opacity = '0';
        }

        const file = new File([fileData], book.title + '.epub', { type: 'application/epub+zip' });
        await loadFromFile(file);

        // Apply all settings BEFORE position restoration to prevent reflow
        if (epubRendererRef.current) {
          console.log('🎨 Applying reading settings before position restoration...');
          handleSettingsChange(readingSettings);
        }

        // After book is loaded and settings applied, jump to saved position if available
        if (bookId && (savedLocation || savedPercentage > 0) && epubRendererRef.current) {
          console.log('📍 Attempting to restore reading position with enhanced system...');
          console.log('  Saved location:', savedLocation);
          console.log('  Saved percentage:', savedPercentage + '%');
          
          try {
            // Viewport-consistent position restoration with expert-level coordination
            let restored = false;
            
            // Implement coordinated restoration with proper timing
            const performCoordinatedRestoration = async () => {
              try {
                // Wait for all async content loading to complete
                await new Promise<void>(resolve => {
                  const checkContentStable = () => {
                    const pendingImages = containerRef.current?.querySelectorAll('img:not([src^="blob:"]):not([src^="data:"])');
                    if (pendingImages && pendingImages.length > 0) {
                      console.log(`⏳ Waiting for ${pendingImages.length} images before restoration...`);
                      setTimeout(checkContentStable, 100);
                    } else {
                      // Additional delay to ensure layout is stable
                      setTimeout(resolve, 150);
                    }
                  };
                  checkContentStable();
                });
                
                // First try CFI restoration with viewport alignment
                if (savedLocation && !savedLocation.includes('undefined') && savedLocation.trim() && epubRendererRef.current) {
                  console.log('🎆 Expert CFI restoration with:', savedLocation.substring(0, 50) + '...');
                  restored = await epubRendererRef.current.displayCfi(savedLocation);
                  
                  if (restored) {
                    console.log('✅ Viewport-aligned position restored using CFI');
                    await new Promise(resolve => setTimeout(resolve, 200)); // Wait for scroll to complete
                  }
                }
                
                // If CFI restoration failed, use enhanced percentage-based restoration
                if (!restored && savedPercentage > 0 && epubRendererRef.current) {
                  console.log('🎆 Expert percentage restoration:', savedPercentage + '%');
                  epubRendererRef.current.restoreToPercentage(savedPercentage);
                  restored = true;
                  console.log('✅ Viewport-aligned position restored using percentage');
                  await new Promise(resolve => setTimeout(resolve, 200)); // Wait for scroll to complete
                }
                
                // Always show container after restoration is complete
                if (containerRef.current) {
                  containerRef.current.style.transition = 'opacity 0.3s ease-out';
                  containerRef.current.style.opacity = '1';
                  
                  if (restored) {
                    console.log('✅ Viewport-consistent restoration completed successfully');
                  } else {
                    console.warn('⚠️ Restoration failed, showing book from beginning');
                  }
                } else {
                  console.warn('⚠️ Container missing after restoration awaits; skip style application');
                }
                
              } catch (error) {
                console.error('❌ Error in coordinated restoration:', error);
                // Ensure container is always shown
                if (containerRef.current) {
                  containerRef.current.style.opacity = '1';
                }
              }
            };
            
            // Execute coordinated restoration
            await performCoordinatedRestoration();
          } catch (error) {
            console.error('❌ Error during position restoration:', error);
            // Show container immediately if restoration failed
            if (containerRef.current) {
              containerRef.current.style.opacity = '1';
            }
          }
        } else {
          // For books without saved progress, ensure container shows after content is ready
          const showContainerWhenReady = () => {
            const checkReady = () => {
              const pendingImages = containerRef.current?.querySelectorAll('img:not([src^="blob:"]):not([src^="data:"])');
              if (pendingImages && pendingImages.length > 0) {
                setTimeout(checkReady, 100);
              } else {
                if (containerRef.current) {
                  containerRef.current.style.transition = 'opacity 0.3s ease-out';
                  containerRef.current.style.opacity = '1';
                  console.log('✅ Container shown after content ready (no saved position)');
                }
              }
            };
            setTimeout(checkReady, 100);
          };
          showContainerWhenReady();
        }

        // Load annotations after position restoration is complete
        if (bookId && epubRendererRef.current) {
          await loadAnnotations(epubRendererRef.current);
        }
        
      } catch (err) {
        console.error('❌ Error loading book:', err);
        setError("Failed to load book");
        setIsLoading(false);
      }
    };

    loadBookFromDatabase();
  }, [bookId, authReady, containerReady, loadFromFile, router, supabase, loadAnnotations]);

  // Helper function to perform the actual save
  const performProgressSave = useCallback(async (userId: string, progress: number) => {
    if (!bookId) return false;
    
    try {
      // Get current CFI position (legacy compatibility)
      const cfi = epubRendererRef.current?.getCurrentCfi() || '';
      
      // Try to get enhanced position data from the new PositionManager
      let enhancedPosition: SavedPosition | null = null;
      try {
        const positionManager = epubRendererRef.current?.getPositionManager();
        if (positionManager) {
          enhancedPosition = positionManager.capturePosition();
          console.log('📍 Captured enhanced position data:', {
            cfi: enhancedPosition.cfi,
            chapterIndex: enhancedPosition.chapterIndex,
            paragraphIndex: enhancedPosition.paragraphIndex,
            hasTextContext: !!enhancedPosition.textContext
          });
        }
      } catch (error) {
        console.warn('⚠️ Failed to capture enhanced position, using legacy CFI:', error);
      }
      
      // Prepare data for database save - Use correct database field names
      const saveData: {
        user_id: string;
        book_id: string;
        current_location: string;
        progress_percentage: number;
        last_read_at: string;
      } = {
        user_id: userId,
        book_id: bookId,
        current_location: cfi,
        progress_percentage: progress,
        last_read_at: new Date().toISOString()
      };
      if (enhancedPosition) {
        console.log('📍 Enhanced position captured but not saved (schema limitation):', {
          cfi: enhancedPosition.cfi,
          chapterIndex: enhancedPosition.chapterIndex,
          hasTextContext: !!enhancedPosition.textContext,
          confidence: enhancedPosition.confidence
        });
        
        // TODO: Create database migration to add enhanced position columns:
        // backup_cfi, text_context, viewport_width, viewport_height,
        // font_size, font_family, line_height, theme, settings_hash,
        // restoration_strategy, position_confidence
      }
      
      const { error } = await supabase
        .from('reading_progress')
        .upsert(saveData, {
          onConflict: 'user_id,book_id'
        });

      if (!error) {
        console.log('✅ Progress saved:', progress + '%', enhancedPosition ? '(enhanced data captured but not persisted)' : '(basic format)');
        return true;
      } else {
        console.error('❌ Database save error:', {
          message: error.message || 'Unknown database error',
          details: error.details || 'No details available',
          hint: error.hint || 'No hint available',
          code: error.code || 'No error code',
          saveData: Object.keys(saveData),
          fullError: error
        });
      }
      return false;
    } catch (error) {
      console.error('❌ Error saving reading progress:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }, [bookId, supabase]);

  // Save reading progress to database with queue
  const saveReadingProgress = useCallback(async (progress: number, immediate: boolean = false) => {
    if (!bookId || !authReady) return;
    
    // Get user once per invocation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Queue the save request
    saveProgressQueueRef.current = { progress, timestamp: Date.now() };
    
    // Clear existing timeout
    if (saveProgressTimeoutRef.current) {
      clearTimeout(saveProgressTimeoutRef.current);
    }
    
    // If immediate save requested, save now
    if (immediate) {
      const toSave = saveProgressQueueRef.current;
      if (toSave) {
        await performProgressSave(user.id, toSave.progress);
        saveProgressQueueRef.current = null;
      }
    } else {
      // Debounce saves to every 2 seconds
      saveProgressTimeoutRef.current = setTimeout(async () => {
        const toSave = saveProgressQueueRef.current;
        if (toSave) {
          await performProgressSave(user.id, toSave.progress);
          saveProgressQueueRef.current = null;
        }
      }, 2000);
    }
  }, [bookId, authReady, supabase, performProgressSave]);

  // Auto-save progress when it changes
  useEffect(() => {
    if (!bookId || currentProgress === 0) return;
    
    // Save with debouncing (not immediate)
    saveReadingProgress(currentProgress, false);
  }, [currentProgress, bookId, saveReadingProgress]);

  // Save progress on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (bookId && currentProgress > 0) {
        // Save immediately on unload
        saveReadingProgress(currentProgress, true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      // Save when component unmounts
      if (bookId && currentProgress > 0) {
        saveReadingProgress(currentProgress, true);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [bookId, currentProgress, saveReadingProgress]);

  // Add visibilitychange as fallback for unreliable beforeunload
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && bookId && currentProgress > 0) {
        // Fire-and-forget; don't await
        void saveReadingProgress(currentProgress, true);
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [bookId, currentProgress, saveReadingProgress]);

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
    setUserTheme(newTheme);
  }, [theme, setUserTheme]);

  const onTocJump = useCallback(async (href: string) => {
    if (epubRendererRef.current) {
      epubRendererRef.current.jumpToChapter(href);
      setShowToc(false);
    }
  }, []);

  const toggleToc = useCallback(() => {
    tocSidebar.toggle();
  }, [tocSidebar]);

  const toggleAnnotations = useCallback(() => {
    annotationsSidebar.toggle();
  }, [annotationsSidebar]);

  const togglePinnedToolbar = useCallback(() => {
    setIsToolbarPinned(prev => !prev);
  }, []);

  const createAnnotation = useCallback(async (type: 'highlight' | 'note' | 'bookmark', color: string = 'rgba(251, 191, 36, 0.3)', note?: string) => {
    if (!bookId || !loaded?.renderer) return;
    
    // Define variables at the top of the function scope
    let content = "";
    let cfi = "";
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentChapter = loaded.renderer.getCurrentChapter();
      
      if (type === 'highlight' || type === 'note') {
        content = selectedText;
        cfi = selectionCfi;
      } else if (type === 'bookmark') {
        content = currentChapter || "Bookmark";
        cfi = loaded.renderer.getCurrentCfi();
      }

      // Build the insert object
      const annotationData: any = {
        user_id: user.id,
        book_id: bookId,
        content,
        note: note || null,
        location: cfi,
        annotation_type: type,
        color
      };

      const { data: newAnnotation, error } = await supabase
        .from('annotations')
        .insert(annotationData)
        .select()
        .single();

      if (error) throw error;
      
      // Immediately apply the highlight if it's a highlight or note
      if (newAnnotation && epubRendererRef.current && (type === 'highlight' || type === 'note')) {
        epubRendererRef.current.addAnnotation({
          id: newAnnotation.id,
          location: newAnnotation.location,
          content: newAnnotation.content,
          color: newAnnotation.color,
          annotation_type: newAnnotation.annotation_type,
          note: newAnnotation.note
        });
      }
      
      // Show success toast
      const messages = {
        highlight: 'Highlight saved',
        note: 'Note added',
        bookmark: 'Bookmark created'
      };
      setToast({ message: messages[type], type: 'success' });
      
      // Clear selection
      setSelectedText("");
      setSelectionCfi("");
      setShowAnnotationToolbar(false);
      window.getSelection()?.removeAllRanges();
      
    } catch (error) {
      console.error('Error creating annotation:', error);
      setToast({ message: 'Failed to save annotation', type: 'error' });
    }
  }, [bookId, loaded, supabase, selectedText, selectionCfi]);

  const jumpToAnnotation = useCallback(async (location: string, annotationId: string) => {
    if (!epubRendererRef.current || !location) return;
    
    const jumped = await epubRendererRef.current.navigateToAnnotation(annotationId);
    if (jumped) {
      setShowAnnotations(false);
    } else {
      console.warn('Failed to jump to annotation:', location);
    }
  }, []);

  // Handlers for ContextualToolbar
  const handleNavigateHome = useCallback(() => {
    router.push('/library');
  }, [router]);

  const handleThemeChange = useCallback((newTheme: 'light' | 'dark') => {
    // Update the theme in ThemeProvider
    setUserTheme(newTheme);
    
    // Update reading settings to store the theme
    setReadingSettings(prev => ({ ...prev, theme: newTheme as any }));
    
    // Apply theme to epub renderer
    if (epubRendererRef.current) {
      epubRendererRef.current.setTheme(newTheme);
    }
  }, [setUserTheme]);

  const handleFontSizeChange = useCallback((size: number) => {
    setFontSize(size);
    if (epubRendererRef.current) {
      epubRendererRef.current.setFontSize(size);
    }
  }, []);

  const toggleSearch = useCallback(() => {
    searchSidebar.toggle();
  }, [searchSidebar]);

  const toggleAIChat = useCallback(() => {
    aiSidebar.toggle();
  }, [aiSidebar]);

  const toggleSettings = useCallback(() => {
    settingsSidebar.toggle();
  }, [settingsSidebar]);

  // Settings handlers - optimized with batched DOM updates
  const handleSettingsChange = useCallback((newSettings: Partial<SimplifiedReadingSettings>) => {
    setReadingSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Apply relevant settings to the renderer
      if (epubRendererRef.current) {
        if (newSettings.fontSize !== undefined) {
          epubRendererRef.current.setFontSize(newSettings.fontSize);
        }
        if (newSettings.theme !== undefined) {
          epubRendererRef.current.setTheme(newSettings.theme);
          // Don't call setUserTheme here - use effect instead
        }
      }
      
      // Apply container styles and content styles with batched DOM updates
      if (containerRef.current) {
        const container = containerRef.current;
        
        // Batch DOM reads and writes to prevent layout thrashing
        requestAnimationFrame(() => {
          // Apply to all chapter content
          const chapters = container.querySelectorAll('[data-chapter-index]');
          
          // Build CSS rule strings to minimize style recalculations
          const cssUpdates: string[] = [];
          
          chapters.forEach((chapter: any) => {
            // Use CSS custom properties for better performance when possible
            // Typography
            if (newSettings.fontFamily !== undefined) {
              chapter.style.fontFamily = newSettings.fontFamily;
            }
            if (newSettings.lineHeight !== undefined) {
              chapter.style.lineHeight = newSettings.lineHeight.toString();
            }
            if (newSettings.letterSpacing !== undefined) {
              chapter.style.letterSpacing = `${newSettings.letterSpacing}px`;
            }
            if (newSettings.textAlign !== undefined) {
              chapter.style.textAlign = newSettings.textAlign;
            }
            
            // Margins
            if (newSettings.marginHorizontal !== undefined) {
              chapter.style.paddingLeft = `${newSettings.marginHorizontal}px`;
              chapter.style.paddingRight = `${newSettings.marginHorizontal}px`;
            }
            if (newSettings.marginVertical !== undefined) {
              chapter.style.paddingTop = `${newSettings.marginVertical}px`;
              chapter.style.paddingBottom = `${newSettings.marginVertical}px`;
            }
            
            // Max width constraint
            if (newSettings.maxWidth !== undefined) {
              if (newSettings.maxWidth > 0) {
                chapter.style.maxWidth = `${newSettings.maxWidth}px`;
                chapter.style.margin = '0 auto';
              } else {
                chapter.style.maxWidth = 'none';
                chapter.style.margin = '0';
              }
            }
          });
          
          // Display filters (brightness/contrast) applied to container
          if (newSettings.brightness !== undefined || newSettings.contrast !== undefined) {
            const brightness = newSettings.brightness ?? updated.brightness;
            const contrast = newSettings.contrast ?? updated.contrast;
            container.style.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
          }
        });
      }
      
      // Auto-hide toolbar
      if (newSettings.autoHideToolbar !== undefined) {
        setIsToolbarPinned(!newSettings.autoHideToolbar);
      }
      
      return updated;
    });
  }, []);

  // Sync theme changes with global theme
  useEffect(() => {
    if (readingSettings.theme !== resolvedTheme) {
      setUserTheme(readingSettings.theme);
    }
  }, [readingSettings.theme, setUserTheme]);

  const handleResetSettings = useCallback(() => {
    const defaultSettings: SimplifiedReadingSettings = {
      fontSize: 16,
      fontFamily: 'system-ui',
      lineHeight: 1.6,
      letterSpacing: 0,
      textAlign: 'left',
      marginHorizontal: 40,
      marginVertical: 40,
      maxWidth: 0,
      theme: 'light',
      brightness: 100,
      contrast: 100,
      autoHideToolbar: true,
      readingSpeed: 250
    };
    
    handleSettingsChange(defaultSettings);
  }, [handleSettingsChange]);

  // Search handlers
  const handleSearch = useCallback(async (query: string) => {
    if (!epubRendererRef.current) return [];
    
    try {
      const results = await epubRendererRef.current.searchInBook(query);
      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }, []);

  const handleNavigateToSearchResult = useCallback((result: any) => {
    if (!epubRendererRef.current) return;
    
    const success = epubRendererRef.current.navigateToSearchResult({
      chapterIndex: result.chapterIndex,
      position: result.position,
      text: result.text
    });
    
    if (success) {
      // Optionally close search panel after navigation
      // setShowSearch(false);
    }
  }, []);

  const toggleBookmark = useCallback(async () => {
    if (!bookId || !epubRendererRef.current) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const currentCfi = epubRendererRef.current.getCurrentCfi();
      
      if (isBookmarked) {
        // Remove bookmark
        const { data: existingBookmark } = await supabase
          .from('annotations')
          .select('id')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .eq('location', currentCfi)
          .eq('annotation_type', 'bookmark')
          .single();
        
        if (existingBookmark) {
          const { error } = await supabase
            .from('annotations')
            .delete()
            .eq('id', existingBookmark.id);
          
          if (!error) {
            setIsBookmarked(false);
            setToast({ message: 'Bookmark removed', type: 'success' });
          }
        }
      } else {
        // Add bookmark
        await createAnnotation('bookmark');
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      setToast({ message: 'Failed to toggle bookmark', type: 'error' });
    }
  }, [bookId, isBookmarked, createAnnotation, supabase]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
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
      
      // Don't handle navigation if text is being selected or input is focused
      const selection = window.getSelection();
      const hasSelection = selection && !selection.isCollapsed;
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                            document.activeElement?.tagName === 'TEXTAREA';
      
      if (hasSelection || isInputFocused) {
        return; // Let default behavior handle it
      }
      
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
    
    // Increased threshold to 100px and added velocity check
    const minSwipeDistance = 100;
    const maxSwipeTime = 500; // Increased time allowance
    const velocity = Math.abs(deltaX) / deltaTime;
    const minVelocity = 0.3; // pixels per millisecond
    
    // Only handle swipes that are primarily horizontal with sufficient distance or velocity
    if (deltaTime < maxSwipeTime && 
        Math.abs(deltaX) > Math.abs(deltaY) * 2 && // More horizontal than vertical
        (Math.abs(deltaX) > minSwipeDistance || velocity > minVelocity)) {
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
      className="min-h-dvh relative bg-[rgb(var(--bg))] transition-colors duration-300"
    >
      {/* Background overlay removed for uniform dark theme */}
      
      {/* Hidden file input */}
      <input ref={inputRef} type="file" accept=".epub" className="hidden" onChange={onInputChange} />

      {/* Desktop Toolbar hover zone - only when unpinned */}
      {!isMobile && !isToolbarPinned && (
        <div 
          className="fixed top-0 left-0 right-0 h-48 z-[60]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ pointerEvents: 'auto', background: 'transparent' }}
        />
      )}

      {/* Contextual Toolbar - Desktop/Tablet */}
      {!isMobile && loaded && (
        <ContextualToolbar
          // Navigation
          onNavigateHome={handleNavigateHome}
          onNavigatePrev={handlePreviousPage}
          onNavigateNext={handleNextPage}
          canGoNext={navigationState.canGoNext}
          canGoPrev={navigationState.canGoPrev}
          
          // Theme & Display
          currentTheme={resolvedTheme}
          onThemeChange={handleThemeChange}
          fontSize={fontSize}
          onFontSizeChange={handleFontSizeChange}
          
          // Panels
          showToc={tocSidebar.isOpen}
          showAnnotations={annotationsSidebar.isOpen}
          showSettings={settingsSidebar.isOpen}
          showSearch={searchSidebar.isOpen}
          showAIChat={aiSidebar.isOpen}
          onToggleToc={toggleToc}
          onToggleAnnotations={toggleAnnotations}
          onToggleSettings={toggleSettings}
          onToggleSearch={toggleSearch}
          onToggleAIChat={toggleAIChat}
          
          // Progress
          progress={currentProgress}
          chapterTitle={chapterTitle}
          timeLeft={timeLeft}
          
          // Bookmarks
          isBookmarked={isBookmarked}
          onToggleBookmark={toggleBookmark}
          
          // Fullscreen
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          
          // Visibility
          isVisible={isToolbarPinned || isHovering || !loaded}
          autoHide={!isToolbarPinned}
          isMobile={isMobile}
          
          // Pin state
          isPinned={isToolbarPinned}
          onTogglePin={togglePinnedToolbar}
        />
      )}

      {/* Mobile Toolbar */}
      {isMobile && loaded && (
        <MobileToolbar
          onNavigateHome={handleNavigateHome}
          onNavigatePrev={handlePreviousPage}
          onNavigateNext={handleNextPage}
          canGoNext={navigationState.canGoNext}
          canGoPrev={navigationState.canGoPrev}
          currentTheme={resolvedTheme}
          onThemeChange={handleThemeChange}
          fontSize={fontSize}
          onFontSizeChange={handleFontSizeChange}
          showToc={tocSidebar.isOpen}
          showAnnotations={annotationsSidebar.isOpen}
          showSettings={settingsSidebar.isOpen}
          showSearch={searchSidebar.isOpen}
          showAIChat={aiSidebar.isOpen}
          onToggleToc={toggleToc}
          onToggleAnnotations={toggleAnnotations}
          onToggleSettings={toggleSettings}
          onToggleSearch={toggleSearch}
          onToggleAIChat={toggleAIChat}
          progress={currentProgress}
          chapterTitle={chapterTitle}
          timeLeft={timeLeft}
          isBookmarked={isBookmarked}
          onToggleBookmark={toggleBookmark}
          isVisible={loaded && !error}
        />
      )}
      
      {/* Open EPUB button when no book is loaded */}
      {!loaded && !bookId && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70]">
          <div className="floating rounded-[var(--radius-xl)] px-6 py-3.5" style={{
            boxShadow: "0 25px 80px -12px rgba(0, 0, 0, 0.25), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))"
          }}>
            <button 
              onClick={onPick} 
              className="btn-secondary px-4 py-2 text-sm font-medium"
            >
              Open EPUB
            </button>
          </div>
        </div>
      )}

      {/* Improved Table of Contents */}
      <TableOfContents
        items={toc}
        currentChapter={chapterTitle}
        onNavigate={onTocJump}
        isOpen={tocSidebar.isOpen}
        onClose={toggleToc}
        isMobile={isMobile}
        progress={currentProgress}
        bookTitle={loaded?.title}
      />

      {/* Search Panel */}
      <SearchPanel
        isOpen={searchSidebar.isOpen}
        onClose={toggleSearch}
        onSearch={handleSearch}
        onNavigateToResult={handleNavigateToSearchResult}
        currentChapter={chapterTitle}
        isMobile={isMobile}
      />

      {/* Settings Panel */}
      <EnhancedSettingsPanel
        visible={settingsSidebar.isOpen}
        settings={readingSettings}
        onSettingsChange={handleSettingsChange}
        onClose={toggleSettings}
        onReset={handleResetSettings}
        isMobile={isMobile}
      />

      {/* Mobile toolbar is now handled by ContextualToolbar component above */}

      {/* Main Reading Area */}
      <main className={`min-h-dvh flex items-start justify-center ${isMobile ? 'px-3 sm:px-4 pb-24 pt-4' : 'p-8'}`}>
        <div className="w-full max-w-5xl relative">
          {/* EPUB Container - Clean scrollable container */}
          <div className="relative">
            <div
              ref={containerRef}
              className="epub-container rounded-[var(--radius-2xl)] transition-all duration-300 relative bg-[rgb(var(--bg))] text-[rgb(var(--fg))]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{
                height: "calc(100vh - 128px)",
                maxHeight: "calc(100vh - 128px)",
                maxWidth: "960px",
                margin: "0 auto",
                boxShadow: theme === "dark" 
                  ? "0 30px 90px -20px rgba(0, 0, 0, 0.6), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))" 
                  : "0 30px 90px -20px rgba(0, 0, 0, 0.15), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))",
                overflowY: "auto",
                overflowX: "hidden",
                scrollBehavior: "smooth",
                WebkitOverflowScrolling: "touch",
                // Prevent white flash by setting initial color
                color: theme === "dark" ? "#f5f5f7" : "#1c2024"
              }}
            />
          </div>
        </div>
      </main>

      {/* Floating Status/Error Message */}
      {(error || (isHovering && loaded)) && (
        <div 
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[65] transition-elegant ${(error || (isHovering && loaded)) ? 'contextual show' : 'contextual'}`}
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

      {/* Enhanced Loading Overlay - Clean transition */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" 
             style={{
               background: `rgb(var(--bg))`,
               backdropFilter: 'none'
             }}>
          <div className="text-center space-y-8 animate-scale-in">
            {/* Book icon with subtle glow */}
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[rgb(var(--accent))]/10 to-[rgb(var(--accent))]/5 flex items-center justify-center relative">
              <svg className="w-10 h-10 text-[rgb(var(--accent))]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {/* Subtle pulse animation */}
              <div className="absolute inset-0 rounded-2xl bg-[rgb(var(--accent))]/5 animate-pulse" />
            </div>
            
            {/* Elegant spinner */}
            <div className="relative">
              <div className="w-8 h-8 mx-auto border-2 border-[rgb(var(--accent))]/20 border-t-[rgb(var(--accent))] rounded-full animate-spin" />
            </div>
            
            {/* Text with better hierarchy */}
            <div className="space-y-2">
              <p className="text-xl font-semibold text-[rgb(var(--fg))]">Opening your book</p>
              <p className="text-sm text-[rgb(var(--muted))]">This will just take a moment...</p>
            </div>
          </div>
        </div>
      )}

      {/* Annotation Panel */}
      <AnnotationPanel
        bookId={bookId || ""}
        isOpen={annotationsSidebar.isOpen}
        onClose={() => annotationsSidebar.close()}
        onJumpToAnnotation={jumpToAnnotation}
        onDeleteAnnotation={(annotationId) => {
          if (epubRendererRef.current) {
            epubRendererRef.current.removeAnnotation(annotationId);
          }
        }}
        isMobile={isMobile}
      />

      {/* Annotation Toolbar */}
      <AnnotationToolbar
        isVisible={showAnnotationToolbar}
        position={annotationToolbarPos}
        selectedText={selectedText}
        onHighlight={(color) => createAnnotation('highlight', color)}
        onNote={() => {
          setNotePopoverPos(annotationToolbarPos);
          setShowAnnotationToolbar(false); // Hide toolbar but don't clear selection
          setShowNoteModal(true);
        }}
        onBookmark={() => createAnnotation('bookmark')}
        onClose={() => {
          setShowAnnotationToolbar(false);
          setSelectedText("");
          setSelectionCfi("");
          window.getSelection()?.removeAllRanges();
        }}
      />

      {/* Note Modal - Responsive */}
      {isMobile ? (
        <NoteMobileModal
          visible={showNoteModal}
          selectedText={selectedText}
          onSave={async (note) => {
            await createAnnotation('note', 'rgba(99, 102, 241, 0.15)', note); // Soft indigo for notes
            setShowNoteModal(false);
            // Clear selection after successful save
            setSelectedText("");
            setSelectionCfi("");
            window.getSelection()?.removeAllRanges();
          }}
          onClose={() => {
            setShowNoteModal(false);
            // Clear selection when canceling
            setSelectedText("");
            setSelectionCfi("");
            window.getSelection()?.removeAllRanges();
          }}
        />
      ) : (
        <NotePopover
          visible={showNoteModal}
          position={notePopoverPos}
          selectedText={selectedText}
          onSave={async (note) => {
            await createAnnotation('note', 'rgba(99, 102, 241, 0.15)', note); // Soft indigo for notes
            setShowNoteModal(false);
            // Clear selection after successful save
            setSelectedText("");
            setSelectionCfi("");
            window.getSelection()?.removeAllRanges();
          }}
          onClose={() => {
            setShowNoteModal(false);
            // Clear selection when canceling
            setSelectedText("");
            setSelectionCfi("");
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          description={toast.message}
          variant={toast.type === 'success' ? 'success' : toast.type === 'error' ? 'error' : 'info'}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Enhanced AI Assistant with GPT-5 Models */}
      <EnhancedAIAssistant
        isOpen={aiSidebar.isOpen}
        onClose={() => aiSidebar.close()}
        {...(bookId && { bookId })}
        {...(loaded?.title && { bookTitle: loaded.title })}
        {...(chapterTitle && { currentChapter: chapterTitle })}
        {...(epubRendererRef.current?.getCurrentCfi() && { currentCFI: epubRendererRef.current.getCurrentCfi() })}
        {...(selectedText && { currentText: selectedText, selectedText })}
        {...(currentProgress !== undefined && { progressPercent: currentProgress })}
        // Note: totalPages would be real page count if available from book.spine
        {...(currentUserId && { userId: currentUserId })}
      />
    </div>
  );
}

export default function ReaderPage() {
  return (
    <UIStateProvider>
      <ReaderPageContent />
    </UIStateProvider>
  );
}
