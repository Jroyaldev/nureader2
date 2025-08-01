"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import UploadModal from "@/components/UploadModal";
import { BookOpenIcon, PlusIcon, UserIcon, FolderIcon } from "@heroicons/react/24/outline";

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

  return (
    <main className="min-h-dvh bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/10">
      <div className="container-px py-12 space-y-12">
        {/* Elegant Header */}
        <header className="text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent">
            Your Library
          </h1>
          <p className="text-lg text-muted font-light max-w-2xl mx-auto">
            Discover, organize, and enjoy your digital book collection
          </p>
        </header>

        {/* Quick Actions */}
        <section className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 flex-1"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="relative flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PlusIcon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-semibold mb-1">Add New Book</h3>
                  <p className="text-blue-100">Upload EPUB files to your library</p>
                </div>
              </div>
            </button>
            
            <Link
              href="/collections"
              className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 sm:w-auto"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="relative flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FolderIcon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-semibold mb-1">Collections</h3>
                  <p className="text-green-100">Organize your books</p>
                </div>
              </div>
            </Link>

            <Link
              href="/profile"
              className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 sm:w-auto"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="relative flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-semibold mb-1">Profile</h3>
                  <p className="text-purple-100">Manage your preferences</p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Book Grid */}
        <section className="space-y-8 max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-surface rounded-2xl p-6">
                    <div className="aspect-[3/4] rounded-xl bg-gray-200 dark:bg-gray-700 mb-4" />
                    <div className="space-y-2">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-16">
              <BookOpenIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-medium mb-2">No books yet</h3>
              <p className="text-muted mb-6">Upload your first EPUB to start reading</p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add Your First Book
              </button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-medium mb-2">Your Library</h2>
                <p className="text-muted">{books.length} {books.length === 1 ? 'book' : 'books'}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {books.map((book) => (
                  <Link 
                    key={book.id} 
                    href={`/reader?id=${book.id}`} 
                    className="group block transition-elegant hover:scale-105"
                  >
                    <div className="bg-surface rounded-2xl p-6 shadow-lg hover:shadow-xl transition-elegant">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                        {book.cover_path && getCoverUrl(book.cover_path) ? (
                          <img 
                            src={getCoverUrl(book.cover_path)!} 
                            alt={`${book.title} cover`}
                            className="w-full h-full object-cover transition-elegant group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpenIcon className="w-16 h-16 text-gray-400 dark:text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-medium text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-elegant line-clamp-2">
                          {book.title}
                        </h3>
                        <p className="text-muted text-sm line-clamp-1">{book.author || 'Unknown Author'}</p>
                        {book.description && (
                          <p className="text-muted text-xs line-clamp-2 leading-relaxed">{book.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted mt-2">
                          {book.page_count && (
                            <span>{book.page_count} pages</span>
                          )}
                          {book.published_date && (
                            <span>{new Date(book.published_date).getFullYear()}</span>
                          )}
                          {book.language && book.language !== 'en' && (
                            <span className="uppercase">{book.language}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Navigation Back */}
        <div className="text-center pt-8">
          <Link 
            href="/" 
            className="btn-secondary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </main>
  );
}