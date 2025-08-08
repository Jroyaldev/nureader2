import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  apiHandler, 
  requireAuth, 
  validateRequest, 
  paginatedResponse,
  ApiError,
  rateLimit 
} from '@/lib/api/middleware';
import { bookSearchSchema } from '@/lib/validations';

export const GET = apiHandler(async (request: NextRequest) => {
  // Rate limiting for search
  await rateLimit(request, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
  });

  // Require authentication
  const user = await requireAuth(request);
  
  // Validate query parameters
  const searchParams = new URL(request.url).searchParams;
  const validatedData = await validateRequest(
    request,
    bookSearchSchema,
    'query'
  );

  const { 
    query, 
    filters = {},
    pagination = { page: 1, limit: 20, sortBy: 'relevance', sortOrder: 'desc' }
  } = validatedData;

  const supabase = await createClient();

  try {
    // Use the full-text search function we created
    const offset = (pagination.page - 1) * pagination.limit;
    
    // Call the search_books function
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_books', {
        search_query: query,
        user_id_param: user.id,
        limit_param: pagination.limit,
        offset_param: offset,
      });

    if (searchError) {
      throw new ApiError(
        'Search failed',
        500,
        'SEARCH_ERROR',
        { error: searchError.message }
      );
    }

    // Apply additional filters if provided
    let filteredResults = searchResults || [];
    
    if (filters.author) {
      filteredResults = filteredResults.filter(book => 
        book.author?.toLowerCase().includes(filters.author!.toLowerCase())
      );
    }
    
    if (filters.language) {
      filteredResults = filteredResults.filter(book => 
        book.language === filters.language
      );
    }

    // If filtering by annotations or progress, we need to join with those tables
    if (filters.hasAnnotations || filters.inProgress) {
      const bookIds = filteredResults.map(b => b.id);
      
      if (filters.hasAnnotations && bookIds.length > 0) {
        const { data: annotatedBooks } = await supabase
          .from('annotations')
          .select('book_id')
          .eq('user_id', user.id)
          .in('book_id', bookIds);
        
        const annotatedBookIds = new Set(annotatedBooks?.map(a => a.book_id) || []);
        filteredResults = filteredResults.filter(b => annotatedBookIds.has(b.id));
      }
      
      if (filters.inProgress && bookIds.length > 0) {
        const { data: progressBooks } = await supabase
          .from('reading_progress')
          .select('book_id, percentage_complete')
          .eq('user_id', user.id)
          .in('book_id', bookIds)
          .gt('percentage_complete', 0)
          .lt('percentage_complete', 100);
        
        const inProgressBookIds = new Set(progressBooks?.map(p => p.book_id) || []);
        filteredResults = filteredResults.filter(b => inProgressBookIds.has(b.id));
      }
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .textSearch('search_vector', query);

    return paginatedResponse(
      filteredResults,
      pagination.page,
      pagination.limit,
      totalCount || 0
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      'Failed to search books',
      500,
      'SEARCH_FAILED',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});