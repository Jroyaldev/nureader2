import { QueryClient, QueryClientConfig } from '@tanstack/react-query';
import { AxiosError } from 'axios';

// Configure React Query with optimal settings
const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Stale time: data is fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache time: data stays in cache for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry configuration
      retry: (failureCount, error) => {
        if (error instanceof AxiosError) {
          // Don't retry on 4xx errors (client errors)
          if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
            return false;
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      retryDelay: 1000,
    },
  },
};

// Create the query client
export const queryClient = new QueryClient(queryConfig);

// Query keys factory for type-safe query keys
export const queryKeys = {
  all: [''] as const,
  auth: () => ['auth'] as const,
  user: () => ['user'] as const,
  books: {
    all: () => ['books'] as const,
    lists: () => [...queryKeys.books.all(), 'list'] as const,
    list: (filters: string) => [...queryKeys.books.lists(), { filters }] as const,
    details: () => [...queryKeys.books.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.books.details(), id] as const,
    search: (query: string) => [...queryKeys.books.all(), 'search', query] as const,
  },
  reading: {
    all: () => ['reading'] as const,
    progress: (bookId: string) => [...queryKeys.reading.all(), 'progress', bookId] as const,
    sessions: (bookId: string) => [...queryKeys.reading.all(), 'sessions', bookId] as const,
    annotations: (bookId: string) => [...queryKeys.reading.all(), 'annotations', bookId] as const,
    annotation: (id: string) => [...queryKeys.reading.all(), 'annotation', id] as const,
  },
  collections: {
    all: () => ['collections'] as const,
    lists: () => [...queryKeys.collections.all(), 'list'] as const,
    detail: (id: string) => [...queryKeys.collections.all(), id] as const,
  },
  profile: {
    all: () => ['profile'] as const,
    detail: (id: string) => [...queryKeys.profile.all(), id] as const,
    preferences: () => [...queryKeys.profile.all(), 'preferences'] as const,
  },
} as const;

// Offline manager configuration
export const setupOfflineManager = () => {
  if (typeof window !== 'undefined') {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      queryClient.resumePausedMutations();
      queryClient.refetchQueries();
    });

    window.addEventListener('offline', () => {
      // Queries and mutations will be paused automatically
      console.log('Application is offline. Data will sync when connection is restored.');
    });
  }
};

// Cache persistence utilities
export const persistQueryClient = async () => {
  if (typeof window === 'undefined') return;

  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  const persistedData = queries.map(query => ({
    queryKey: query.queryKey,
    queryHash: query.queryHash,
    state: query.state,
  }));

  localStorage.setItem('react-query-cache', JSON.stringify(persistedData));
};

export const restoreQueryClient = async () => {
  if (typeof window === 'undefined') return;

  const persistedData = localStorage.getItem('react-query-cache');
  if (!persistedData) return;

  try {
    const queries = JSON.parse(persistedData);
    
    queries.forEach((query: any) => {
      queryClient.setQueryData(query.queryKey, query.state.data);
    });
  } catch (error) {
    console.error('Failed to restore query cache:', error);
    localStorage.removeItem('react-query-cache');
  }
};

// Optimistic update helper
export const optimisticUpdate = <TData, TVariables>(
  queryKey: readonly unknown[],
  updater: (old: TData | undefined, variables: TVariables) => TData
) => {
  return {
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update
      queryClient.setQueryData<TData>(queryKey, (old) => updater(old, variables));

      // Return context with snapshot
      return { previousData };
    },
    onError: (err: unknown, variables: TVariables, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey });
    },
  };
};