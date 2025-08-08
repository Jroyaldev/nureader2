import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, optimisticUpdate } from '@/lib/react-query';
import { readingService } from '@/services/readingService';
import { ReadingProgress, Annotation, ReadingSession } from '@/types/reading';

// Reading progress hooks
export const useReadingProgress = (bookId: string) => {
  return useQuery({
    queryKey: queryKeys.reading.progress(bookId),
    queryFn: () => readingService.getProgress(bookId),
    enabled: !!bookId,
    refetchInterval: 30000, // Refetch every 30 seconds for sync
  });
};

export const useUpdateProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (progress: Partial<ReadingProgress>) =>
      readingService.saveProgress(progress.bookId!, progress),
    ...optimisticUpdate<ReadingProgress, Partial<ReadingProgress>>(
      queryKeys.reading.all(),
      (old, updates) => ({ ...old, ...updates } as ReadingProgress)
    ),
    onSuccess: (data, variables) => {
      // Update specific progress cache
      queryClient.setQueryData(
        queryKeys.reading.progress(variables.bookId!),
        data
      );
    },
  });
};

// Reading sessions hooks
export const useReadingSessions = (bookId: string) => {
  return useQuery({
    queryKey: queryKeys.reading.sessions(bookId),
    queryFn: () => readingService.getReadingSessions(bookId),
    enabled: !!bookId,
  });
};

export const useStartReadingSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, session }: { bookId: string; session: Partial<ReadingSession> }) =>
      readingService.startReadingSession(bookId, session),
    onSuccess: (sessionId, { bookId }) => {
      // Store session ID for later use
      sessionStorage.setItem('activeReadingSession', sessionId);
      
      // Invalidate sessions list
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.reading.sessions(bookId) 
      });
    },
  });
};

export const useEndReadingSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => readingService.endActiveSession(),
    onSuccess: () => {
      sessionStorage.removeItem('activeReadingSession');
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.reading.all() 
      });
    },
  });
};

// Annotations hooks
export const useAnnotations = (bookId: string) => {
  return useQuery({
    queryKey: queryKeys.reading.annotations(bookId),
    queryFn: () => readingService.getAnnotations(bookId),
    enabled: !!bookId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAnnotation = (annotationId: string) => {
  return useQuery({
    queryKey: queryKeys.reading.annotation(annotationId),
    queryFn: () => readingService.getAnnotation(annotationId),
    enabled: !!annotationId,
  });
};

export const useCreateAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (annotation: Partial<Annotation>) =>
      readingService.createAnnotation(annotation),
    onMutate: async (newAnnotation) => {
      // Cancel queries
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.reading.annotations(newAnnotation.bookId!) 
      });

      // Snapshot
      const previousAnnotations = queryClient.getQueryData<Annotation[]>(
        queryKeys.reading.annotations(newAnnotation.bookId!)
      );

      // Optimistic update
      queryClient.setQueryData<Annotation[]>(
        queryKeys.reading.annotations(newAnnotation.bookId!),
        (old = []) => [...old, { ...newAnnotation, id: 'temp-' + Date.now() } as Annotation]
      );

      return { previousAnnotations };
    },
    onError: (err, newAnnotation, context) => {
      // Rollback
      if (context?.previousAnnotations) {
        queryClient.setQueryData(
          queryKeys.reading.annotations(newAnnotation.bookId!),
          context.previousAnnotations
        );
      }
    },
    onSuccess: (data) => {
      // Update with real data
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.reading.annotations(data.bookId) 
      });
    },
  });
};

export const useUpdateAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Annotation> }) =>
      readingService.updateAnnotation(id, updates),
    onSuccess: (data) => {
      // Update specific annotation
      queryClient.setQueryData(
        queryKeys.reading.annotation(data.id),
        data
      );
      
      // Invalidate list
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.reading.annotations(data.bookId) 
      });
    },
  });
};

export const useDeleteAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, bookId }: { id: string; bookId: string }) =>
      readingService.deleteAnnotation(id),
    onMutate: async ({ id, bookId }) => {
      // Cancel queries
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.reading.annotations(bookId) 
      });

      // Optimistic removal
      queryClient.setQueryData<Annotation[]>(
        queryKeys.reading.annotations(bookId),
        (old = []) => old.filter(a => a.id !== id)
      );
    },
    onError: (err, { bookId }) => {
      // Refetch on error
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.reading.annotations(bookId) 
      });
    },
  });
};

// Bulk operations
export const useBulkDeleteAnnotations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, bookId }: { ids: string[]; bookId: string }) =>
      Promise.all(ids.map(id => readingService.deleteAnnotation(id))),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.reading.annotations(bookId) 
      });
    },
  });
};

// Real-time subscription hook
export const useAnnotationSubscription = (bookId: string, enabled = true) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !bookId) return;

    const unsubscribe = readingService.subscribeToAnnotations(
      bookId,
      (annotation) => {
        // Update cache with real-time data
        queryClient.setQueryData<Annotation[]>(
          queryKeys.reading.annotations(bookId),
          (old = []) => {
            const index = old.findIndex(a => a.id === annotation.id);
            if (index >= 0) {
              // Update existing
              const updated = [...old];
              updated[index] = annotation;
              return updated;
            } else {
              // Add new
              return [...old, annotation];
            }
          }
        );
      }
    );

    return () => unsubscribe();
  }, [bookId, enabled, queryClient]);
};

// Prefetch annotations for performance
export const usePrefetchAnnotations = () => {
  const queryClient = useQueryClient();

  return (bookId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.reading.annotations(bookId),
      queryFn: () => readingService.getAnnotations(bookId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
};

// Background sync for offline annotations
export const useAnnotationSync = () => {
  const queryClient = useQueryClient();

  const syncAnnotations = async (bookId: string) => {
    // Get pending mutations for this book
    const pendingMutations = queryClient.getMutationCache().getAll()
      .filter(mutation => 
        mutation.state.status === 'pending' &&
        mutation.options.mutationKey?.includes('annotation')
      );

    if (pendingMutations.length > 0) {
      console.log(`Syncing ${pendingMutations.length} pending annotations...`);
      await queryClient.resumePausedMutations();
    }

    // Refetch annotations
    await queryClient.refetchQueries({ 
      queryKey: queryKeys.reading.annotations(bookId) 
    });
  };

  return { syncAnnotations };
};

import { useEffect } from 'react';