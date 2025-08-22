"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { logout } from '@/app/logout/actions';
import UploadModal from "@/components/UploadModal";
import BookDetailsEditor from "@/components/BookDetailsEditor";
import { 
  BookOpenIcon, 
  PlusIcon, 
  UserIcon, 
  FolderIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  ClockIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";

interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_path: string | null;
  cover_url: string | null;
  isbn: string | null;
  language: string;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'title' | 'author' | 'recent' | 'oldest';

export default function LibraryPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // New UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  // Persisted preferences: initialize from localStorage
  useEffect(() => {
    try {
      const persistedView = window.localStorage.getItem('library:view');
      const persistedSort = window.localStorage.getItem('library:sort');
      const persistedLang = window.localStorage.getItem('library:lang');
      const persistedSearch = window.localStorage.getItem('library:search');
      if (persistedView === 'grid' || persistedView === 'list') setViewMode(persistedView);
      if (persistedSort === 'recent' || persistedSort === 'oldest' || persistedSort === 'title' || persistedSort === 'author') setSortBy(persistedSort as SortBy);
      if (persistedLang) setSelectedLanguage(persistedLang);
      if (persistedSearch) setSearchQuery(persistedSearch);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Persist preferences on change
  useEffect(() => {
    try {
      window.localStorage.setItem('library:view', viewMode);
    } catch {}
  }, [viewMode]);
  useEffect(() => {
    try {
      window.localStorage.setItem('library:sort', sortBy);
    } catch {}
  }, [sortBy]);
  useEffect(() => {
    try {
      window.localStorage.setItem('library:lang', selectedLanguage);
    } catch {}
  }, [selectedLanguage]);
  useEffect(() => {
    try {
      window.localStorage.setItem('library:search', searchQuery);
    } catch {}
  }, [searchQuery]);

  // Keyboard shortcuts: '/' focus search, 'v' toggle view, 'u' open upload
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true');
      if (isTyping) return;
      if (e.key === '/') {
        const el = document.getElementById('library-search-input') as HTMLInputElement | null;
        if (el) {
          e.preventDefault();
          el.focus();
        }
      } else if (e.key.toLowerCase() === 'v') {
        setViewMode(prev => (prev === 'grid' ? 'list' : 'grid'));
      } else if (e.key.toLowerCase() === 'u') {
        setIsUploadModalOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close menus on outside click or Escape
  useEffect(() => {
    if (!showSortMenu && !showUserMenu) return;
    const onClick = (e: MouseEvent) => {
      if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSortMenu(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [showSortMenu, showUserMenu]);
  
  const supabase = createClient();

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process cover URLs for each book
      const booksWithCovers = (data || []).map(book => ({
        ...book,
        cover_url: book.cover_path ? getCoverUrl(book.cover_path) : null
      }));
      
      setBooks(booksWithCovers);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Filter and sort books
  const processedBooks = useMemo(() => {
    let filtered = books;
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Language filter
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(book => book.language === selectedLanguage);
    }
    
    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'author':
        sorted.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    
    return sorted;
  }, [books, searchQuery, selectedLanguage, sortBy]);

  // Get unique languages for filter
  const availableLanguages = useMemo(() => {
    const langs = new Set(books.map(book => book.language).filter(Boolean));
    return Array.from(langs);
  }, [books]);

  const handleUploadComplete = useCallback(() => {
    fetchBooks();
  }, [fetchBooks]);

  const getCoverUrl = useCallback((coverPath: string | null) => {
    if (!coverPath) {
      return null;
    }
    const { data } = supabase.storage.from('book-covers').getPublicUrl(coverPath);
    return data.publicUrl;
  }, [supabase]);

  const handleDeleteBook = async () => {
    if (!deletingBook) return;
    
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Delete related data first (due to foreign key constraints)
      await supabase.from('reading_progress').delete().eq('book_id', deletingBook.id);
      await supabase.from('annotations').delete().eq('book_id', deletingBook.id);
      await supabase.from('book_collections').delete().eq('book_id', deletingBook.id);

      // Delete files from storage
      if (deletingBook.file_path) {
        await supabase.storage.from('epub-files').remove([deletingBook.file_path]);
      }
      if (deletingBook.cover_path) {
        await supabase.storage.from('book-covers').remove([deletingBook.cover_path]);
      }

      // Finally, delete the book record
      const { error: bookError } = await supabase
        .from('books')
        .delete()
        .eq('id', deletingBook.id)
        .eq('user_id', user.id);

      if (bookError) {
        throw new Error(`Failed to delete book: ${bookError.message}`);
      }

      // Update local state
      setBooks(books.filter(book => book.id !== deletingBook.id));
      setDeletingBook(null);
    } catch (error) {
      console.error('Error deleting book:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete book. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <main className="min-h-dvh bg-[rgb(var(--bg))] relative">
      {/* Subtle gradient overlay instead of bubble shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgb(var(--fg))]/[0.02]" />
      </div>
      
      <div className="relative z-10">
        {/* Navigation Bar with glassmorphism */}
        <nav className="w-full px-4 sm:px-8 lg:px-12 py-4 sm:py-6">
          <div className="max-w-7xl mx-auto">
            <div className="reader-glass rounded-xl sm:rounded-2xl px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-8 min-w-0">
                <Link 
                  href="/" 
                  className="flex items-center gap-1 sm:gap-2 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors px-2 sm:px-3 py-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden xs:inline">Home</span>
                </Link>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <BookOpenIcon className="w-5 h-5 text-[rgb(var(--accent))] flex-shrink-0" />
                  <h1 className="text-lg sm:text-xl font-bold text-[rgb(var(--fg))] truncate">Library</h1>
                </div>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                <Link
                  href="/collections"
                  className="p-2 sm:p-2.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
                  title="Collections"
                >
                  <FolderIcon className="w-5 h-5 text-[rgb(var(--muted))]" />
                </Link>
                
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-medium rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-1 sm:gap-2"
                  aria-label="Add book"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="hidden xs:inline">Add Book</span>
                </button>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
                    aria-haspopup="menu"
                    aria-expanded={showUserMenu}
                    aria-label="User menu"
                  >
                    <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-full bg-gradient-to-br from-[rgb(var(--accent))] to-[rgb(var(--accent))]/80 flex items-center justify-center">
                      <span className="text-white font-semibold text-xs sm:text-sm">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <ChevronDownIcon className="w-4 h-4 text-[rgb(var(--muted))] hidden sm:block" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 reader-glass rounded-xl shadow-2xl py-2 z-20 animate-fade-in" role="menu">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-[rgb(var(--border))]/[var(--border-opacity)]">
                        <p className="font-medium text-[rgb(var(--fg))] text-sm">
                          {user?.user_metadata?.full_name || 'Reader'}
                        </p>
                        <p className="text-[rgb(var(--muted))] text-xs truncate">
                          {user?.email}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[rgb(var(--muted))]/10 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                        role="menuitem"
                      >
                        <UserIcon className="w-4 h-4 text-[rgb(var(--muted))]" />
                        <span className="text-sm text-[rgb(var(--fg))]">Profile</span>
                      </Link>

                      <div className="border-t border-[rgb(var(--border))]/[var(--border-opacity)] mt-2 pt-2">
                        <form action={logout}>
                          <button
                            type="submit"
                            className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-red-600 dark:text-red-400 w-full text-left"
                            role="menuitem"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-sm">Sign out</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Header Section */}
        <header className="px-4 sm:px-8 lg:px-12 py-4 sm:py-8">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Stats and Search - Stack on mobile */}
            <div className="space-y-4 sm:space-y-6">
              {/* Stats Row */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--fg))]">
                    {!isLoading && books.length} {!isLoading && (books.length === 1 ? 'Book' : 'Books')}
                    {isLoading && 'Loading...'}
                  </h2>
                  {!isLoading && (
                    <p className="text-[rgb(var(--muted))] mt-1 text-sm sm:text-base">
                      {searchQuery && `${processedBooks.length} result${processedBooks.length !== 1 ? 's' : ''} for "${searchQuery}"`}
                      {selectedLanguage !== 'all' && ` in ${selectedLanguage}`}
                      {!searchQuery && selectedLanguage === 'all' && 'Your digital library'}
                    </p>
                  )}
                </div>
              </div>

              {/* Search Bar - Full width on mobile */}
              <div className="w-full sm:max-w-md relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--muted))] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by title or author…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  id="library-search-input"
                  aria-label="Search library by title or author"
                  className="input-search w-full pl-10 pr-12"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Controls Bar - Optimized for mobile */}
            <div className="glass rounded-xl sm:rounded-2xl border px-3 sm:px-4 md:px-5 py-3 md:py-4 flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
              {/* View Mode Toggle (segmented control) - Touch optimized */}
              <div className="segmented-control min-w-0" role="group" aria-label="View mode">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  className="inline-flex items-center gap-1 sm:gap-1.5 touch-target min-w-0"
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <Squares2X2Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden xs:inline text-xs sm:text-sm">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  className="inline-flex items-center gap-1 sm:gap-1.5 touch-target min-w-0"
                  title="List view"
                  aria-label="List view"
                >
                  <ListBulletIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden xs:inline text-xs sm:text-sm">List</span>
                </button>
              </div>

              {/* Sort Menu - Mobile optimized */}
              <div className="relative flex-shrink-0" ref={sortMenuRef}>
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-[rgb(var(--muted))]/5 border border-[rgb(var(--border))]/10 hover:bg-[rgb(var(--muted))]/10 transition-all inline-flex items-center gap-1 sm:gap-2 touch-target"
                  aria-haspopup="menu"
                  aria-expanded={showSortMenu}
                  aria-label="Sort books"
                >
                  <ArrowsUpDownIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium hidden xs:inline truncate">
                    {sortBy === 'recent' ? 'Recent' :
                     sortBy === 'oldest' ? 'Oldest' :
                     sortBy === 'title' ? 'A-Z' : 'Author'}
                  </span>
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 mt-2 w-56 glass rounded-xl shadow-2xl py-2 z-20 animate-scale-in" role="menu">
                    {[
                      { value: 'recent', label: 'Recently Added', icon: ClockIcon },
                      { value: 'oldest', label: 'Oldest First', icon: ClockIcon },
                      { value: 'title', label: 'Title A-Z', icon: ListBulletIcon },
                      { value: 'author', label: 'Author A-Z', icon: UserIcon },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value as SortBy);
                          setShowSortMenu(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-[rgb(var(--muted))]/10 transition-colors flex items-center gap-3 ${
                          sortBy === option.value ? 'text-[rgb(var(--accent))]' : ''
                        }`}
                        role="menuitemradio"
                        aria-checked={sortBy === option.value}
                      >
                        <option.icon className="w-4 h-4" />
                        <span className="text-sm">{option.label}</span>
                        {sortBy === option.value && (
                          <CheckIcon className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter Button - Mobile optimized */}
              {availableLanguages.length > 1 && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border transition-all inline-flex items-center gap-1 sm:gap-2 touch-target flex-shrink-0 ${
                    showFilters
                      ? 'bg-[rgb(var(--muted))]/12 border-[rgb(var(--accent))]/40 text-[rgb(var(--fg))]'
                      : 'bg-[rgb(var(--muted))]/5 border border-[rgb(var(--border))]/10 hover:bg-[rgb(var(--muted))]/10 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]'
                  }`}
                  aria-pressed={showFilters}
                  aria-label="Toggle filters"
                >
                  <FunnelIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium hidden xs:inline">Filters</span>
                  {selectedLanguage !== 'all' && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))] rounded text-xs font-medium">1</span>
                  )}
                </button>
              )}
            </div>

            {/* Filter Panel - Mobile optimized */}
            {showFilters && availableLanguages.length > 1 && (
              <div className="p-3 sm:p-4 glass rounded-xl">
                <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
                  <span className="text-sm text-[rgb(var(--muted))] font-medium">Language:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedLanguage('all')}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all touch-target ${
                        selectedLanguage === 'all'
                          ? 'bg-[rgb(var(--fg))] text-[rgb(var(--bg))]'
                          : 'bg-[rgb(var(--bg))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] border border-[rgb(var(--border))]/[var(--border-opacity)]'
                      }`}
                    >
                      All
                    </button>
                    {availableLanguages.map(lang => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all touch-target ${
                          selectedLanguage === lang
                            ? 'bg-[rgb(var(--fg))] text-[rgb(var(--bg))]'
                            : 'bg-[rgb(var(--bg))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] border border-[rgb(var(--border))]/[var(--border-opacity)]'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Book Display Section */}
        <section className="px-8 lg:px-12 pb-12">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              // Loading State
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-8"
                : "space-y-4 pb-8"
              }>
                {[...Array(viewMode === 'grid' ? 12 : 5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    {viewMode === 'grid' ? (
                      <>
                        <div className="aspect-[3/4] rounded-xl bg-[rgb(var(--border))]/[var(--border-opacity)] mb-3" />
                        <div className="space-y-2">
                          <div className="h-4 bg-[rgb(var(--border))]/[var(--border-opacity)] rounded" />
                          <div className="h-3 bg-[rgb(var(--border))]/[var(--border-opacity)] rounded w-3/4" />
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-4 p-4 bg-[rgb(var(--surface))] rounded-xl">
                        <div className="w-24 h-32 bg-[rgb(var(--border))]/[var(--border-opacity)] rounded-lg" />
                        <div className="flex-1 space-y-3">
                          <div className="h-5 bg-[rgb(var(--border))]/[var(--border-opacity)] rounded w-1/3" />
                          <div className="h-4 bg-[rgb(var(--border))]/[var(--border-opacity)] rounded w-1/4" />
                          <div className="h-3 bg-[rgb(var(--border))]/[var(--border-opacity)] rounded w-1/2" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : processedBooks.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-[rgb(var(--accent))]/20 to-[rgb(var(--accent))]/5 flex items-center justify-center">
                  <BookOpenIcon className="w-12 h-12 text-[rgb(var(--accent))]" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-[rgb(var(--fg))]">
                  {searchQuery ? 'No books found' : 'Your library awaits'}
                </h3>
                <p className="text-[rgb(var(--muted))] mb-8 text-center max-w-md">
                  {searchQuery ? 'Try adjusting your search terms' : 'Upload your first EPUB to start building your digital library'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Upload Your First Book
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              // Grid View
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-8">
                {processedBooks.map((book) => (
                  <div
                    key={book.id}
                    className="group relative"
                  >
                    <Link 
                      href={`/reader?id=${book.id}`} 
                      className="block"
                    >
                      <div className="space-y-3">
                        {/* Book Cover with glassmorphism */}
                        <div className="aspect-[3/4] rounded-xl overflow-hidden reader-glass transition-all duration-300 relative group-hover:scale-[1.03] group-hover:shadow-2xl">
                          {getCoverUrl(book.cover_path) ? (
                            <img 
                              src={getCoverUrl(book.cover_path)!} 
                              alt={`${book.title} cover`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-[rgb(var(--accent))]/10 to-[rgb(var(--accent))]/20">
                              <div className="text-center">
                                <BookOpenIcon className="w-12 h-12 text-[rgb(var(--accent))]/40 mx-auto mb-3" />
                                <p className="text-xs text-[rgb(var(--muted))] font-medium line-clamp-2">{book.title}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Action buttons overlay (always visible on mobile) */}
                          <div className="absolute top-2 right-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingBook(book);
                              }}
                              className="w-8 h-8 rounded-lg bg-[rgb(var(--bg))]/90 backdrop-blur-sm flex items-center justify-center hover:bg-[rgb(var(--bg))] transition-colors shadow-lg"
                              title="Edit book details"
                              aria-label={`Edit ${book.title}`}
                            >
                              <PencilIcon className="w-4 h-4 text-[rgb(var(--fg))]" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeletingBook(book);
                              }}
                              className="w-8 h-8 rounded-lg bg-[rgb(var(--bg))]/90 backdrop-blur-sm flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-lg"
                              title="Delete book"
                              aria-label={`Delete ${book.title}`}
                            >
                              <TrashIcon className="w-4 h-4 text-[rgb(var(--fg))]" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Book Info */}
                        <div className="space-y-1 px-1">
                          <h3 className="font-semibold text-sm text-[rgb(var(--fg))] group-hover:text-[rgb(var(--accent))] transition-colors line-clamp-2 leading-tight">
                            {book.title}
                          </h3>
                          <p className="text-[rgb(var(--muted))] text-xs line-clamp-1">
                            {book.author || 'Unknown author'}
                          </p>
                          {/* Additional metadata on hover */}
                          <div className="hidden group-hover:flex flex-wrap gap-2 text-[10px] text-[rgb(var(--muted))]/70 mt-1">
                            {book.page_count && <span>{book.page_count}p</span>}
                            {book.language && <span>• {book.language}</span>}
                            {book.publisher && <span>• {book.publisher}</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              // List View
              <div className="space-y-3">
                {processedBooks.map((book) => (
                  <Link
                    key={book.id}
                    href={`/reader?id=${book.id}`}
                    className="group flex gap-4 p-4 reader-floating rounded-xl transition-all hover:scale-[1.01] hover:shadow-xl"
                  >
                    {/* Cover Thumbnail */}
                    <div className="w-24 h-32 rounded-lg overflow-hidden bg-gradient-to-br from-[rgb(var(--accent))]/5 to-[rgb(var(--accent))]/10 flex-shrink-0 border border-[rgb(var(--border))]/10">
                      {getCoverUrl(book.cover_path) ? (
                        <img 
                          src={getCoverUrl(book.cover_path)!} 
                          alt={`${book.title} cover`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpenIcon className="w-8 h-8 text-[rgb(var(--accent))]/30" />
                        </div>
                      )}
                    </div>

                    {/* Book Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-[rgb(var(--fg))] group-hover:text-[rgb(var(--accent))] transition-colors mb-1">
                        {book.title}
                      </h3>
                      <p className="text-sm text-[rgb(var(--muted))] mb-3">
                        {book.author || 'Unknown author'}
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs text-[rgb(var(--muted))]">
                        {book.page_count && (
                          <span className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-[rgb(var(--muted))]/40 rounded-full" />
                            {book.page_count} pages
                          </span>
                        )}
                        {book.file_size && (
                          <span className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-[rgb(var(--muted))]/40 rounded-full" />
                            {formatFileSize(book.file_size)}
                          </span>
                        )}
                        {book.language && (
                          <span className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-[rgb(var(--muted))]/40 rounded-full" />
                            {book.language}
                          </span>
                        )}
                        {book.publisher && (
                          <span className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-[rgb(var(--muted))]/40 rounded-full" />
                            {book.publisher}
                          </span>
                        )}
                        {book.published_date && (
                          <span className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-[rgb(var(--muted))]/40 rounded-full" />
                            {new Date(book.published_date).getFullYear()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions (always visible on mobile) */}
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingBook(book);
                        }}
                        className="w-9 h-9 rounded-lg bg-[rgb(var(--bg))] border border-[rgb(var(--border))]/[var(--border-opacity)] dark:border-white/10 flex items-center justify-center text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:border-[rgb(var(--accent))]/50 transition-all"
                        title="Edit"
                        aria-label={`Edit ${book.title}`}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeletingBook(book);
                        }}
                        className="w-9 h-9 rounded-lg bg-[rgb(var(--bg))] border border-[rgb(var(--border))]/[var(--border-opacity)] dark:border-white/10 flex items-center justify-center text-[rgb(var(--muted))] hover:text-red-500 hover:border-red-500/50 transition-all"
                        title="Delete"
                        aria-label={`Delete ${book.title}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
      
      {/* Book Details Editor */}
      {editingBook && (
        <BookDetailsEditor
          book={editingBook}
          isOpen={!!editingBook}
          onClose={() => setEditingBook(null)}
          onUpdate={fetchBooks}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      {deletingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeletingBook(null)}
          />
          
          <div className="relative w-full max-w-md bg-[rgb(var(--surface))] border border-[rgb(var(--border))]/[var(--border-opacity)] dark:border-white/10 rounded-2xl shadow-2xl dark:shadow-black/50 p-6 backdrop-blur-sm">
            <h3 className="text-xl font-bold mb-4 text-[rgb(var(--fg))]">Delete Book</h3>
            <p className="text-[rgb(var(--muted))] mb-6">
              Are you sure you want to delete "<span className="text-[rgb(var(--fg))] font-medium">{deletingBook.title}</span>"? 
              This will permanently remove the book, all reading progress, annotations, and bookmarks.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingBook(null)}
                className="px-5 py-2.5 rounded-lg bg-[rgb(var(--bg))] border border-[rgb(var(--border))]/[var(--border-opacity)] dark:border-white/10 text-[rgb(var(--fg))] hover:bg-[rgb(var(--surface-hover))] transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBook}
                className="px-5 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
