"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
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
  XMarkIcon
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
  
  // New UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  
  const supabase = createClient();

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
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

  const getCoverUrl = (coverPath: string | null) => {
    if (!coverPath) {
      return null;
    }
    const { data } = supabase.storage.from('book-covers').getPublicUrl(coverPath);
    return data.publicUrl;
  };

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
      {/* Premium gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent))]/5 via-transparent to-[rgb(var(--accent))]/3 opacity-30" />
      </div>
      
      <div className="relative z-10 py-8">
        {/* Top navigation */}
        <nav className="px-8 mb-8">
          <div className="max-w-7xl mx-auto">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Home
            </Link>
          </div>
        </nav>

        {/* Enhanced Header with Search and Controls */}
        <header className="px-8 mb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Title Row */}
            <div className="flex items-center justify-between">
              <div className="animate-fade-in">
                <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-foreground">
                  Library
                </h1>
                <p className="text-base text-muted mt-1">
                  {processedBooks.length} {processedBooks.length === 1 ? 'book' : 'books'}
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-3 animate-fade-in">
                <Link
                  href="/collections"
                  className="btn-icon w-10 h-10"
                  title="Collections"
                >
                  <FolderIcon className="w-5 h-5" />
                </Link>
                <Link
                  href="/profile"
                  className="btn-icon w-10 h-10"
                  title="Profile"
                >
                  <UserIcon className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Book
                </button>
              </div>
            </div>

            {/* Search and Controls Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search books by title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-[rgb(var(--accent))]/50 focus:bg-white/10 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-[rgb(var(--accent))] text-white' 
                        : 'text-muted hover:text-foreground'
                    }`}
                    title="Grid view"
                  >
                    <Squares2X2Icon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'list' 
                        ? 'bg-[rgb(var(--accent))] text-white' 
                        : 'text-muted hover:text-foreground'
                    }`}
                    title="List view"
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="appearance-none pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:border-[rgb(var(--accent))]/50 cursor-pointer"
                  >
                    <option value="recent">Recently Added</option>
                    <option value="oldest">Oldest First</option>
                    <option value="title">Title A-Z</option>
                    <option value="author">Author A-Z</option>
                  </select>
                  <ArrowsUpDownIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                </div>

                {/* Filter Button */}
                {availableLanguages.length > 1 && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2.5 rounded-lg border transition-all ${
                      showFilters 
                        ? 'bg-[rgb(var(--accent))] border-[rgb(var(--accent))] text-white' 
                        : 'bg-white/5 border-white/10 text-muted hover:text-foreground'
                    }`}
                    title="Filters"
                  >
                    <FunnelIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && availableLanguages.length > 1 && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg animate-slide-up">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted">Language:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedLanguage('all')}
                      className={`px-3 py-1 rounded-md text-sm transition-all ${
                        selectedLanguage === 'all'
                          ? 'bg-[rgb(var(--accent))] text-white'
                          : 'bg-white/10 text-muted hover:text-foreground'
                      }`}
                    >
                      All
                    </button>
                    {availableLanguages.map(lang => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={`px-3 py-1 rounded-md text-sm transition-all ${
                          selectedLanguage === lang
                            ? 'bg-[rgb(var(--accent))] text-white'
                            : 'bg-white/10 text-muted hover:text-foreground'
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
        <section className="px-8">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              // Enhanced Loading State
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6"
                : "space-y-3"
              }>
                {[...Array(viewMode === 'grid' ? 14 : 6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    {viewMode === 'grid' ? (
                      <>
                        <div className="aspect-[3/4] rounded-lg bg-white/5 mb-3" />
                        <div className="space-y-2">
                          <div className="h-4 bg-white/5 rounded" />
                          <div className="h-3 bg-white/5 rounded w-3/4" />
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-4 p-4 bg-white/5 rounded-lg">
                        <div className="w-20 h-28 bg-white/10 rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-white/10 rounded w-1/3" />
                          <div className="h-4 bg-white/10 rounded w-1/4" />
                          <div className="h-3 bg-white/10 rounded w-1/2" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : processedBooks.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center py-32">
                <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[rgb(var(--accent))]/20 to-[rgb(var(--accent))]/5 flex items-center justify-center">
                  <BookOpenIcon className="w-10 h-10 text-[rgb(var(--accent))]" />
                </div>
                <h3 className="text-2xl font-semibold mb-2 tracking-tight">
                  {searchQuery ? 'No books found' : 'Your library is empty'}
                </h3>
                <p className="text-base text-muted mb-6">
                  {searchQuery ? 'Try adjusting your search terms' : 'Add your first book to get started'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add Your First Book
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              // Grid View
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
                {processedBooks.map((book, index) => (
                  <div
                    key={book.id}
                    className="group relative animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
                  >
                    <Link 
                      href={`/reader?id=${book.id}`} 
                      className="block"
                    >
                      <div className="space-y-3">
                        {/* Book Cover */}
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-white/5 to-white/10 shadow-sm group-hover:shadow-xl transition-all duration-300 relative">
                          {book.cover_path && getCoverUrl(book.cover_path) ? (
                            <img 
                              src={getCoverUrl(book.cover_path)!} 
                              alt={`${book.title} cover`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-4">
                              <div className="text-center">
                                <BookOpenIcon className="w-10 h-10 text-muted opacity-30 mx-auto mb-3" />
                                <p className="text-xs text-muted font-medium line-clamp-2">{book.title}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Action buttons overlay */}
                          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingBook(book);
                              }}
                              className="w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                              title="Edit book details"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeletingBook(book);
                              }}
                              className="w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                              title="Delete book"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Book Info */}
                        <div className="space-y-1">
                          <h3 className="font-medium text-sm leading-snug text-foreground group-hover:text-[rgb(var(--accent))] transition-colors line-clamp-2">
                            {book.title}
                          </h3>
                          <p className="text-muted text-xs line-clamp-1">{book.author || 'Unknown author'}</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              // List View
              <div className="space-y-3">
                {processedBooks.map((book, index) => (
                  <Link
                    key={book.id}
                    href={`/reader?id=${book.id}`}
                    className="group flex gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-all animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
                  >
                    {/* Cover Thumbnail */}
                    <div className="w-20 h-28 rounded overflow-hidden bg-gradient-to-br from-white/5 to-white/10 flex-shrink-0">
                      {book.cover_path && getCoverUrl(book.cover_path) ? (
                        <img 
                          src={getCoverUrl(book.cover_path)!} 
                          alt={`${book.title} cover`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpenIcon className="w-8 h-8 text-muted opacity-30" />
                        </div>
                      )}
                    </div>

                    {/* Book Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-foreground group-hover:text-[rgb(var(--accent))] transition-colors mb-1">
                        {book.title}
                      </h3>
                      <p className="text-sm text-muted mb-2">{book.author || 'Unknown author'}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-muted">
                        {book.page_count && (
                          <span>{book.page_count} pages</span>
                        )}
                        {book.file_size && (
                          <span>{formatFileSize(book.file_size)}</span>
                        )}
                        {book.language && (
                          <span>{book.language}</span>
                        )}
                        {book.publisher && (
                          <span>{book.publisher}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingBook(book);
                        }}
                        className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-muted hover:text-foreground hover:bg-white/20 transition-all"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeletingBook(book);
                        }}
                        className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-500/20 transition-all"
                        title="Delete"
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setDeletingBook(null)}
          />
          
          <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl animate-scale-in p-6">
            <h3 className="text-xl font-semibold mb-4">Delete Book</h3>
            <p className="text-muted mb-6">
              Are you sure you want to delete "<span className="text-foreground font-medium">{deletingBook.title}</span>"? 
              This will permanently remove the book, all reading progress, annotations, and bookmarks.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingBook(null)}
                className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBook}
                className="px-6 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
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