import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, optimisticUpdate } from '@/lib/react-query';
import { bookService } from '@/services/bookService';
import { Book, BookMetadata } from '@/types/book';

// Fetch all books
export const useBooks = (filters?: { search?: string; collection?: string }) => {
  return useQuery({
    queryKey: queryKeys.books.list(JSON.stringify(filters || {})),
    queryFn: () => bookService.getBooks(filters),
    placeholderData: (previousData) => previousData,
  });
};

// Fetch single book
export const useBook = (bookId: string) => {
  return useQuery({
    queryKey: queryKeys.books.detail(bookId),
    queryFn: () => bookService.getBook(bookId),
    enabled: !!bookId,
  });
};

// Search books
export const useSearchBooks = (query: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.books.search(query),
    queryFn: () => bookService.searchBooks(query),
    enabled: enabled && query.length > 2,
    staleTime: 60 * 1000, // 1 minute
  });
};

// Upload book mutation
export const useUploadBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata?: Partial<BookMetadata> }) =>
      bookService.uploadBook(file, metadata),
    onSuccess: (newBook) => {
      // Invalidate and refetch books list
      queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() });
      
      // Add the new book to the cache
      queryClient.setQueryData(queryKeys.books.detail(newBook.id), newBook);
      
      // Show success notification
      console.log('Book uploaded successfully:', newBook.title);
    },
    onError: (error) => {
      console.error('Failed to upload book:', error);
    },
  });
};

// Update book mutation
export const useUpdateBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, updates }: { bookId: string; updates: Partial<Book> }) =>
      bookService.updateBook(bookId, updates),
    ...optimisticUpdate<Book, { bookId: string; updates: Partial<Book> }>(
      queryKeys.books.all(),
      (old, { updates }) => ({ ...old, ...updates } as Book)
    ),
  });
};

// Delete book mutation
export const useDeleteBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookId: string) => bookService.deleteBook(bookId),
    onMutate: async (bookId) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: queryKeys.books.lists() });

      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.books.detail(bookId) });

      // Optimistically remove from list
      queryClient.setQueriesData(
        { queryKey: queryKeys.books.lists() },
        (old: Book[] | undefined) => old?.filter(book => book.id !== bookId) || []
      );
    },
    onError: () => {
      // Refetch on error
      queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() });
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reading.all() });
    },
  });
};

// Prefetch book for performance
export const usePrefetchBook = () => {
  const queryClient = useQueryClient();

  return (bookId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.books.detail(bookId),
      queryFn: () => bookService.getBook(bookId),
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  };
};

// Bulk operations
export const useBulkDeleteBooks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookIds: string[]) => bookService.bulkDelete(bookIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reading.all() });
    },
  });
};

// Background sync for offline changes
export const useBookSync = () => {
  const queryClient = useQueryClient();

  const syncBooks = async () => {
    const pendingMutations = queryClient.getMutationCache().getAll()
      .filter(mutation => mutation.state.status === 'pending');

    if (pendingMutations.length > 0) {
      console.log(`Syncing ${pendingMutations.length} pending book operations...`);
      await queryClient.resumePausedMutations();
    }

    // Refetch all book data
    await queryClient.refetchQueries({ queryKey: queryKeys.books.all() });
  };

  return { syncBooks };
};