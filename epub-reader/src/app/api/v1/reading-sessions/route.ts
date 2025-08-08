import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  apiHandler, 
  requireAuth, 
  validateRequest,
  successResponse,
  ApiError 
} from '@/lib/api/middleware';
import { readingSessionSchema, uuidSchema } from '@/lib/validations';

// POST /api/v1/reading-sessions - Start or update a reading session
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  const sessionData = await validateRequest(request, readingSessionSchema);

  const supabase = await createClient();

  // Verify book ownership
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id')
    .eq('id', sessionData.bookId)
    .eq('user_id', user.id)
    .single();

  if (bookError || !book) {
    throw new ApiError('Book not found', 404, 'BOOK_NOT_FOUND');
  }

  // Check for active session
  const { data: activeSession } = await supabase
    .from('reading_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('book_id', sessionData.bookId)
    .eq('is_active', true)
    .single();

  if (activeSession) {
    // Update existing session
    const { data: updatedSession, error: updateError } = await supabase
      .from('reading_sessions')
      .update({
        end_chapter_id: sessionData.endChapterId,
        end_cfi: sessionData.endCfi,
        end_percentage: sessionData.endPercentage,
        pages_read: sessionData.pagesRead,
        idle_time_seconds: sessionData.idleTimeSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeSession.id)
      .select()
      .single();

    if (updateError) {
      throw new ApiError(
        'Failed to update session',
        500,
        'UPDATE_FAILED',
        { error: updateError.message }
      );
    }

    return successResponse(updatedSession);
  } else {
    // Create new session
    const { data: newSession, error: createError } = await supabase
      .from('reading_sessions')
      .insert({
        user_id: user.id,
        book_id: sessionData.bookId,
        start_chapter_id: sessionData.startChapterId,
        end_chapter_id: sessionData.endChapterId || sessionData.startChapterId,
        start_cfi: sessionData.startCfi,
        end_cfi: sessionData.endCfi || sessionData.startCfi,
        start_percentage: sessionData.startPercentage,
        end_percentage: sessionData.endPercentage || sessionData.startPercentage,
        pages_read: sessionData.pagesRead || 0,
        device_type: sessionData.deviceType,
        browser: sessionData.browser,
        os: sessionData.os,
        viewport_width: sessionData.viewportWidth,
        viewport_height: sessionData.viewportHeight,
        idle_time_seconds: sessionData.idleTimeSeconds,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      throw new ApiError(
        'Failed to create session',
        500,
        'CREATE_FAILED',
        { error: createError.message }
      );
    }

    return successResponse(newSession, undefined, 201);
  }
});

// PUT /api/v1/reading-sessions/end - End active reading session
export const PUT = apiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  const { bookId } = await validateRequest(
    request,
    readingSessionSchema.pick({ bookId: true })
  );

  const supabase = await createClient();

  // Find and end active session
  const { data: session, error: updateError } = await supabase
    .from('reading_sessions')
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .eq('is_active', true)
    .select()
    .single();

  if (updateError || !session) {
    throw new ApiError(
      'No active session found',
      404,
      'SESSION_NOT_FOUND'
    );
  }

  return successResponse(session);
});

// GET /api/v1/reading-sessions/stats - Get reading statistics
export const GET = apiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  
  const searchParams = new URL(request.url).searchParams;
  const bookId = searchParams.get('bookId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const supabase = await createClient();

  // Get reading statistics using the database function
  const { data: stats, error } = await supabase
    .rpc('get_reading_statistics', {
      user_id_param: user.id,
      book_id_param: bookId ? uuidSchema.parse(bookId) : null,
      start_date: startDate || null,
      end_date: endDate || null,
    })
    .single();

  if (error) {
    throw new ApiError(
      'Failed to get statistics',
      500,
      'STATS_FAILED',
      { error: error.message }
    );
  }

  // Get reading streak
  const { data: streak, error: streakError } = await supabase
    .rpc('get_reading_streak', {
      user_id_param: user.id,
    })
    .single();

  if (streakError) {
    console.error('Failed to get reading streak:', streakError);
  }

  return successResponse({
    ...stats,
    streak: streak || {
      current_streak: 0,
      longest_streak: 0,
      total_reading_days: 0,
      last_reading_date: null,
    },
  });
});