import { Book, BookMetadata } from '@/types'
import { BookService, BookFilters } from '@/types/services'
import { createClient } from '@/utils/supabase/client'

export interface BookUploadOptions {
  file: File;
  userId: string;
  onProgress?: (progress: number) => void;
}

export interface BookSearchResult {
  items: Book[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class BookServiceImpl implements BookService {
  private supabase = createClient();

  /**
   * Validates an EPUB file before upload
   */
  private async validateEpubFile(file: File): Promise<void> {
    // Check file type
    if (!file.type.includes('epub') && !file.name.endsWith('.epub')) {
      throw new Error('File must be an EPUB');
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size must be less than 50MB');
    }

    // Check for malicious content (basic check)
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 4));
    
    // EPUB files should start with PK (ZIP signature)
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
      throw new Error('Invalid EPUB file format');
    }
  }

  /**
   * Calculates file hash for duplicate detection
   */
  private async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async uploadBook(file: File, metadata?: Partial<BookMetadata>): Promise<Book> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      // Validate file
      await this.validateEpubFile(file);

      // Calculate file hash for duplicate detection
      const fileHash = await this.calculateFileHash(file);

      // Check for duplicate
      const { data: existingBook } = await this.supabase
        .from('books')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('file_hash', fileHash)
        .single();

      if (existingBook) {
        throw new Error(`Book "${existingBook.title}" already exists in your library`);
      }

      // Generate unique book ID
      const bookId = crypto.randomUUID();
      const filePath = `books/${user.id}/${bookId}/book.epub`;

      // Upload file to storage
      const { error: uploadError } = await this.supabase.storage
        .from('epub-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Extract metadata (enhanced by EpubService)
      const bookMetadata = {
        id: bookId,
        user_id: user.id,
        title: metadata?.title || file.name.replace('.epub', ''),
        author: metadata?.author || null,
        description: metadata?.description || null,
        file_path: filePath,
        file_size_bytes: file.size,
        file_hash: fileHash,
        upload_date: new Date().toISOString(),
        ...metadata,
      };

      // Create book record
      const { data: book, error: dbError } = await this.supabase
        .from('books')
        .insert(bookMetadata)
        .select()
        .single();

      if (dbError) {
        // Rollback: delete uploaded file
        await this.supabase.storage
          .from('epub-files')
          .remove([filePath]);
        throw new Error(`Failed to save book: ${dbError.message}`);
      }

      return book as Book;
    } catch (error) {
      console.error('Book upload failed:', error);
      throw error;
    }
  }

  async getBooks(filters?: BookFilters): Promise<Book[]> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      let query = this.supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id);

      // Apply filters
      if (filters) {
        if (filters.search) {
          // Use full-text search if available
          const { data, error } = await this.supabase.rpc('search_books', {
            search_query: filters.search,
            user_id_param: user.id,
            limit_param: 100,
            offset_param: 0,
          });
          if (error) throw error;
          return data as Book[];
        }
        
        if (filters.author) {
          query = query.ilike('author', `%${filters.author}%`);
        }
        if (filters.language) {
          query = query.eq('language', filters.language);
        }
      }

      // Order by last opened or upload date
      query = query.order('last_opened', { ascending: false, nullsFirst: false })
                   .order('upload_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return data as Book[];
    } catch (error) {
      console.error('Failed to get books:', error);
      throw error;
    }
  }

  async getBook(id: string): Promise<Book> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      const { data: book, error } = await this.supabase
        .from('books')
        .select(`
          *,
          reading_progress!left(
            percentage_complete,
            chapter_id,
            position,
            total_time_minutes,
            updated_at
          ),
          annotations!left(
            id,
            type,
            chapter_id,
            selected_text,
            note_content,
            color,
            created_at
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !book) {
        throw new Error('Book not found');
      }

      return book as Book;
    } catch (error) {
      console.error('Failed to get book:', error);
      throw error;
    }
  }

  async updateBook(id: string, updates: Partial<Book>): Promise<Book> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      const { data: updatedBook, error } = await this.supabase
        .from('books')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update book: ${error.message}`);
      }

      return updatedBook as Book;
    } catch (error) {
      console.error('Book update failed:', error);
      throw error;
    }
  }

  async deleteBook(id: string): Promise<void> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      // Get book details for file cleanup
      const { data: book, error: fetchError } = await this.supabase
        .from('books')
        .select('file_path, cover_path')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !book) {
        throw new Error('Book not found');
      }

      // Delete files from storage
      const filesToDelete = [];
      if (book.file_path) filesToDelete.push(book.file_path);
      if (book.cover_path) filesToDelete.push(book.cover_path);

      if (filesToDelete.length > 0) {
        await this.supabase.storage
          .from('epub-files')
          .remove(filesToDelete);
      }

      // Delete book record (cascades to related tables)
      const { error: deleteError } = await this.supabase
        .from('books')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error('Failed to delete book');
      }
    } catch (error) {
      console.error('Book deletion failed:', error);
      throw error;
    }
  }

  /**
   * Gets recently read books
   */
  async getRecentlyReadBooks(limit: number = 10): Promise<Book[]> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      const { data, error } = await this.supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .not('last_opened', 'is', null)
        .order('last_opened', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Book[];
    } catch (error) {
      console.error('Failed to get recently read books:', error);
      throw error;
    }
  }

  /**
   * Search books with full-text search
   */
  async searchBooks(query: string, page: number = 1, limit: number = 20): Promise<BookSearchResult> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      const offset = (page - 1) * limit;

      // Use full-text search function
      const { data, error } = await this.supabase.rpc('search_books', {
        search_query: query,
        user_id_param: user.id,
        limit_param: limit,
        offset_param: offset,
      });

      if (error) throw error;

      // Get total count
      const { count } = await this.supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        items: data as Book[],
        pagination: {
          page,
          limit,
          totalPages,
          totalItems: count || 0,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error('Book search failed:', error);
      throw error;
    }
  }
}

export const bookService = new BookServiceImpl()