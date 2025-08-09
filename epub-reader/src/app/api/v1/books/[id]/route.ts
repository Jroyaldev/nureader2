import { NextRequest } from 'next/server';
import { z } from 'zod';

import { 
  ApiError,
  apiHandler, 
  requireAuth, 
  successResponse,
  validateRequest
} from '@/lib/api/middleware';
import { bookMetadataSchema, uuidSchema } from '@/lib/validations';
import { createClient } from '@/utils/supabase/server';

// GET /api/v1/books/[id] - Get a single book
export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const user = await requireAuth(request);
  const bookId = uuidSchema.parse(params.id);
  
  const supabase = await createClient();
  
  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single();

  if (error || !book) {
    throw new ApiError('Book not found', 404, 'BOOK_NOT_FOUND');
  }

  // Get additional data
  const [progressResult, annotationsResult, collectionsResult] = await Promise.all([
    supabase
      .from('reading_progress')
      .select('*')
      .eq('book_id', bookId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('annotations')
      .select('*')
      .eq('book_id', bookId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('book_collections')
      .select('collection_id, collections(id, name, color)')
      .eq('book_id', bookId)
  ]);

  return successResponse({
    ...book,
    reading_progress: progressResult.data,
    annotations: annotationsResult.data || [],
    collections: collectionsResult.data?.map(bc => bc.collections) || [],
  });
});

// PUT /api/v1/books/[id] - Update book metadata
export const PUT = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const user = await requireAuth(request);
  const bookId = uuidSchema.parse(params.id);
  
  const updates = await validateRequest(
    request,
    bookMetadataSchema.partial()
  );

  const supabase = await createClient();

  // Verify ownership
  const { data: existingBook, error: fetchError } = await supabase
    .from('books')
    .select('id')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existingBook) {
    throw new ApiError('Book not found', 404, 'BOOK_NOT_FOUND');
  }

  // Update book
  const { data: updatedBook, error: updateError } = await supabase
    .from('books')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError) {
    throw new ApiError(
      'Failed to update book',
      500,
      'UPDATE_FAILED',
      { error: updateError.message }
    );
  }

  return successResponse(updatedBook);
});

// DELETE /api/v1/books/[id] - Delete a book
export const DELETE = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const user = await requireAuth(request);
  const bookId = uuidSchema.parse(params.id);
  
  const supabase = await createClient();

  // Verify ownership
  const { data: book, error: fetchError } = await supabase
    .from('books')
    .select('file_path, cover_path')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !book) {
    throw new ApiError('Book not found', 404, 'BOOK_NOT_FOUND');
  }

  // Delete files from storage
  const filesToDelete = [];
  if (book.file_path) {
    filesToDelete.push(book.file_path);
  }
  if (book.cover_path) {
    filesToDelete.push(book.cover_path);
  }

  if (filesToDelete.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('epub-files')
      .remove(filesToDelete);

    if (storageError) {
      console.error('Failed to delete files from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }
  }

  // Delete book record (cascades to related tables)
  const { error: deleteError } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId)
    .eq('user_id', user.id);

  if (deleteError) {
    throw new ApiError(
      'Failed to delete book',
      500,
      'DELETE_FAILED',
      { error: deleteError.message }
    );
  }

  return successResponse({ deleted: true }, undefined, 204);
});