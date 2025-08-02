"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import UploadModal from "@/components/UploadModal";
import BookDetailsEditor from "@/components/BookDetailsEditor";
import { BookOpenIcon, PlusIcon, UserIcon, FolderIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

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

export default function LibraryPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
      // Delete reading progress
      const { error: progressError } = await supabase
        .from('reading_progress')
        .delete()
        .eq('book_id', deletingBook.id);
      
      if (progressError) {
        console.error('Error deleting reading progress:', progressError);
      }

      // Delete annotations
      const { error: annotationsError } = await supabase
        .from('annotations')
        .delete()
        .eq('book_id', deletingBook.id);
      
      if (annotationsError) {
        console.error('Error deleting annotations:', annotationsError);
      }

      // Delete from collections
      const { error: collectionsError } = await supabase
        .from('book_collections')
        .delete()
        .eq('book_id', deletingBook.id);
      
      if (collectionsError) {
        console.error('Error deleting from collections:', collectionsError);
      }

      // Delete files from storage
      if (deletingBook.file_path) {
        const { error: epubError } = await supabase.storage
          .from('epub-files')
          .remove([deletingBook.file_path]);
        
        if (epubError) {
          console.error('Error deleting EPUB file:', epubError);
        }
      }

      if (deletingBook.cover_path) {
        const { error: coverError } = await supabase.storage
          .from('book-covers')
          .remove([deletingBook.cover_path]);
        
        if (coverError) {
          console.error('Error deleting cover file:', coverError);
        }
      }

      // Finally, delete the book record
      const { error: bookError } = await supabase
        .from('books')
        .delete()
        .eq('id', deletingBook.id)
        .eq('user_id', user.id); // Add user_id check for extra security

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

        {/* Header with integrated actions - minimal and elegant */}
        <header className="px-8 mb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="animate-fade-in">
                <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-foreground">
                  Library
                </h1>
                <p className="text-base text-muted mt-1">
                  {books.length} {books.length === 1 ? 'book' : 'books'}
                </p>
              </div>
              
              {/* Subtle action buttons in header */}
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
          </div>
        </header>

        {/* Book Grid - Refined with smaller covers */}
        <section className="px-8">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-6">
                {[...Array(14)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] rounded-[var(--radius)] bg-[rgba(var(--muted),0.1)] mb-3" />
                    <div className="space-y-1.5">
                      <div className="h-4 bg-[rgba(var(--muted),0.1)] rounded-[var(--radius-sm)]" />
                      <div className="h-3 bg-[rgba(var(--muted),0.1)] rounded-[var(--radius-sm)] w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : books.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="w-16 h-16 mb-6 rounded-[var(--radius-lg)] bg-[rgba(var(--muted),0.06)] flex items-center justify-center">
                  <BookOpenIcon className="w-8 h-8 text-muted" />
                </div>
                <h3 className="text-xl font-semibold mb-2 tracking-tight">Your library is empty</h3>
                <p className="text-base text-muted mb-6">Add your first book to get started</p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="btn-primary inline-flex items-center gap-2 px-5 py-2.5"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Book
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-6">
                {books.map((book, index) => (
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
                        <div className="aspect-[3/4] rounded-[var(--radius)] overflow-hidden bg-gradient-to-br from-[rgba(var(--muted),0.05)] to-[rgba(var(--muted),0.1)] shadow-sm group-hover:shadow-lg transition-all duration-300 relative">
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
                                <BookOpenIcon className="w-8 h-8 text-muted opacity-40 mx-auto mb-2" />
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
                              className="btn-icon w-8 h-8 bg-[rgb(var(--bg))]/90 backdrop-blur-sm shadow-lg"
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
                              className="btn-icon w-8 h-8 bg-[rgb(var(--bg))]/90 backdrop-blur-sm shadow-lg hover:bg-red-500/20 hover:text-red-500"
                              title="Delete book"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Book Info */}
                        <div className="space-y-0.5">
                          <h3 className="font-medium text-sm leading-snug text-foreground group-hover:text-[rgb(var(--accent))] transition-colors line-clamp-2">
                            {book.title}
                          </h3>
                          <p className="text-muted text-xs line-clamp-1">{book.author || 'Unknown'}</p>
                        </div>
                      </div>
                    </Link>
                  </div>
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
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setDeletingBook(null)}
          />
          
          {/* Dialog */}
          <div className="relative w-full max-w-md bg-[rgb(var(--bg))] rounded-[var(--radius-lg)] shadow-2xl animate-slide-up p-6">
            <h3 className="text-xl font-semibold mb-4">Delete Book</h3>
            <p className="text-muted mb-6">
              Are you sure you want to delete "<span className="text-foreground font-medium">{deletingBook.title}</span>"? 
              This will permanently remove the book, all reading progress, annotations, and bookmarks.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingBook(null)}
                className="btn-secondary px-6"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBook}
                className="btn-primary bg-red-500 hover:bg-red-600 px-6"
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