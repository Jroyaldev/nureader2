import { Annotation } from '@/types'
import { ReadingService, AnnotationFilters, CreateAnnotationRequest } from '@/types/services'
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

// Service-level ReadingProgress type that matches the service implementation
export interface ServiceReadingProgress {
  bookId: string;
  position: string | null; // CFI location
  percentageComplete: number;
  totalTimeMinutes: number;
  lastRead?: string; // ISO string, optional to reduce friction for callers
}

export interface ServiceReadingSession {
  id?: string;
  bookId: string;
  userId?: string; // Add userId for defense-in-depth
  startChapterId?: string;
  endChapterId?: string;
  startCfi?: string;
  endCfi?: string;
  startPercentage?: number;
  endPercentage?: number;
  pagesRead?: number;
  deviceInfo?: {
    type: 'desktop' | 'tablet' | 'mobile' | 'unknown';
    browser?: string;
    os?: string;
    viewport?: { width: number; height: number };
  };
}

// Export DTO for consistent export format
interface ExportDTO {
  exportDate: string;
  userId: string;
  books?: {
    bookId: string;
    progress: ServiceReadingProgress | null;
    annotations: Annotation[];
  }[];
  progress?: any[];
  annotations?: any[];
}

// Helper function to map database rows to ServiceReadingProgress
function mapDbProgressToService(row: any): ServiceReadingProgress {
  return {
    bookId: row.book_id,
    position: row.current_location,
    percentageComplete: row.progress_percentage,
    totalTimeMinutes: row.reading_time_minutes,
    lastRead: row.last_read_at,
  };
}

// Helper function to map database annotation rows to domain Annotation objects
function mapDbAnnotationToDomain(row: any): Annotation {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    type: row.annotation_type,
    content: row.content,
    note: row.note,
    location: row.location,
    color: row.color,
    tags: row.tags || [],
    isPrivate: row.is_private || false,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class ReadingServiceImpl implements ReadingService {
  private supabase = createClient();
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();
  private activeSession: ServiceReadingSession | null = null;
  private sessionTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Starts a new reading session
   */
  async startReadingSession(bookId: string, session: Partial<ServiceReadingSession>): Promise<string> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      // End any existing active sessions
      await this.endActiveSession();

      // Create new session
      const { data, error } = await this.supabase
        .from('reading_sessions')
        .insert({
          user_id: user.id,
          book_id: bookId,
          start_chapter_id: session.startChapterId,
          start_cfi: session.startCfi,
          start_percentage: session.startPercentage,
          device_type: session.deviceInfo?.type,
          browser: session.deviceInfo?.browser,
          os: session.deviceInfo?.os,
          viewport_width: session.deviceInfo?.viewport?.width,
          viewport_height: session.deviceInfo?.viewport?.height,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      this.activeSession = { id: data.id, bookId, userId: user.id, ...session };
      
      // Start session timer for periodic updates
      this.startSessionTimer();

      return data.id;
    } catch (error) {
      console.error('Failed to start reading session:', error);
      throw error;
    }
  }

  /**
   * Updates the current reading session
   */
  private async updateSession(): Promise<void> {
    if (!this.activeSession?.id || !this.activeSession?.userId) return;

    try {
      await this.supabase
        .from('reading_sessions')
        .update({
          end_chapter_id: this.activeSession.endChapterId,
          end_cfi: this.activeSession.endCfi,
          end_percentage: this.activeSession.endPercentage,
          pages_read: this.activeSession.pagesRead,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.activeSession.id)
        .eq('user_id', this.activeSession.userId); // Defense-in-depth user scoping
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }

  /**
   * Starts a timer for periodic session updates
   */
  private startSessionTimer(): void {
    this.stopSessionTimer();
    // Update session every 30 seconds with overlap protection
    let inFlight = false;
    this.sessionTimer = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        await this.updateSession();
      } finally {
        inFlight = false;
      }
    }, 30000);
  }

  /**
   * Stops the session timer
   */
  private stopSessionTimer(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  /**
   * Ends the active reading session
   */
  async endActiveSession(): Promise<void> {
    if (!this.activeSession?.id || !this.activeSession?.userId) return;

    try {
      this.stopSessionTimer();

      await this.supabase
        .from('reading_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          end_chapter_id: this.activeSession.endChapterId,
          end_cfi: this.activeSession.endCfi,
          end_percentage: this.activeSession.endPercentage,
          pages_read: this.activeSession.pagesRead,
        })
        .eq('id', this.activeSession.id)
        .eq('user_id', this.activeSession.userId); // Defense-in-depth user scoping

      this.activeSession = null;
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  /**
   * Records a page turn for the current reading session
   */
  recordPageTurn(bookId: string): void {
    if (this.activeSession?.bookId === bookId) {
      this.activeSession.pagesRead = (this.activeSession.pagesRead || 0) + 1;
    }
  }

  async saveProgress(bookId: string, progress: ServiceReadingProgress): Promise<void> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      // Update active session if exists
      if (this.activeSession?.bookId === bookId) {
        this.activeSession.endCfi = progress.position || undefined;
        this.activeSession.endPercentage = progress.percentageComplete;
        // Note: pagesRead is updated separately via recordPageTurn() method
      }

      // Upsert reading progress - Fixed field names to match database schema
      const { error } = await this.supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          current_location: progress.position, // Fixed: was 'position'
          progress_percentage: progress.percentageComplete, // Fixed: was 'percentage_complete'
          reading_time_minutes: progress.totalTimeMinutes || 0, // Fixed: was 'total_time_minutes'
          last_read_at: new Date().toISOString(), // Fixed: was 'updated_at'
        }, {
          onConflict: 'user_id,book_id',
        });
      
      // Note: chapter_id removed as it doesn't exist in current database schema

      if (error) throw error;

      // Update book's last_opened timestamp
      await this.supabase
        .from('books')
        .update({ last_opened: new Date().toISOString() })
        .eq('id', bookId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Failed to save progress:', error);
      throw error;
    }
  }

  async getProgress(bookId: string): Promise<ServiceReadingProgress | null> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      const { data, error } = await this.supabase
        .from('reading_progress')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      return data ? {
        bookId: data.book_id,
        position: data.current_location,
        percentageComplete: data.progress_percentage,
        totalTimeMinutes: data.reading_time_minutes,
        lastRead: data.last_read_at,
      } : null;
    } catch (error) {
      console.error('Failed to get progress:', error);
      throw error;
    }
  }

  async createAnnotation(annotation: CreateAnnotationRequest): Promise<Annotation> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      // Check for conflicting annotations at the same position
      if (annotation.location) {
        const { data: existing, error: existingErr } = await this.supabase
          .from('annotations')
          .select('id')
          .eq('book_id', annotation.bookId)
          .eq('user_id', user.id)
          .eq('location', annotation.location)
          .eq('annotation_type', annotation.type)
          .maybeSingle();

        if (existingErr) {
          throw existingErr;
        }
        if (existing) {
          throw new Error('An annotation already exists at this position');
        }
      }

      const { data, error } = await this.supabase
        .from('annotations')
        .insert({
          user_id: user.id,
          book_id: annotation.bookId,
          annotation_type: annotation.type,
          content: annotation.content,
          note: annotation.note,
          location: annotation.location,
          color: annotation.color,
        })
        .select()
        .single();

      if (error) throw error;

      return mapDbAnnotationToDomain(data);
    } catch (error) {
      console.error('Failed to create annotation:', error);
      throw error;
    }
  }

  async getAnnotations(bookId: string, filters?: AnnotationFilters): Promise<Annotation[]> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      let query = this.supabase
        .from('annotations')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id);

      // Apply filters
      if (filters) {
        if (filters.type) {
          query = query.eq('annotation_type', filters.type);
        }
        // if (filters.chapterId) {
        //   query = query.eq('chapter_id', filters.chapterId);
        // }  // Removed: chapterId not in schema
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(mapDbAnnotationToDomain);
    } catch (error) {
      console.error('Failed to get annotations:', error);
      throw error;
    }
  }

  async updateAnnotation(id: string, updates: Partial<Annotation>): Promise<Annotation> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      // Note: UpdateAnnotationRequest doesn't include location updates
      // so no need to check for position conflicts

      // Whitelist updatable fields to prevent unintended updates
      const allowedUpdates: { [key: string]: any } = {
        updated_at: new Date().toISOString(),
      };

      // Only include explicitly allowed fields
      if (updates.content !== undefined) allowedUpdates.content = updates.content;
      if (updates.note !== undefined) allowedUpdates.note = updates.note;
      if (updates.color !== undefined) allowedUpdates.color = updates.color;
      if (updates.type !== undefined) allowedUpdates.annotation_type = updates.type;
      // Handle both type and annotation_type for backward compatibility
      if ((updates as any).annotation_type !== undefined) allowedUpdates.annotation_type = (updates as any).annotation_type;

      const { data, error } = await this.supabase
        .from('annotations')
        .update(allowedUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return mapDbAnnotationToDomain(data);
    } catch (error) {
      console.error('Failed to update annotation:', error);
      throw error;
    }
  }

  async deleteAnnotation(id: string): Promise<void> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      const { error } = await this.supabase
        .from('annotations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete annotation:', error);
      throw error;
    }
  }

  /**
   * Subscribes to real-time progress updates for cross-device sync
   */
  async subscribeToProgressUpdates(
    bookId: string,
    onUpdate: (progress: ServiceReadingProgress) => void
  ): Promise<() => void> {
    try {
      // Get current user for filtering
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('Authentication required for real-time subscriptions');
        return () => {};
      }

      const channelName = `progress:${bookId}:${user.id}`;
      
      // Clean up existing channel if any
      this.unsubscribeFromProgressUpdates(bookId);

      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'reading_progress',
            filter: `book_id=eq.${bookId}`,
          },
          (payload) => {
            if (payload.new && payload.new.user_id === user.id) {
              const progress = mapDbProgressToService(payload.new);
              onUpdate(progress);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'reading_progress',
            filter: `book_id=eq.${bookId}`,
          },
          (payload) => {
            if (payload.new && payload.new.user_id === user.id) {
              const progress = mapDbProgressToService(payload.new);
              onUpdate(progress);
            }
          }
        )
        .subscribe();

      this.realtimeChannels.set(bookId, channel);

      // Return unsubscribe function
      return () => this.unsubscribeFromProgressUpdates(bookId);
    } catch (error) {
      console.error('Failed to subscribe to progress updates:', error);
      return () => {};
    }
  }

  /**
   * Unsubscribes from real-time progress updates
   */
  private unsubscribeFromProgressUpdates(bookId: string): void {
    const channel = this.realtimeChannels.get(bookId);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.realtimeChannels.delete(bookId);
    }
  }

  /**
   * Exports user data for backup
   */
  async exportUserData(bookId?: string): Promise<ExportDTO> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      const exportData: ExportDTO = {
        exportDate: new Date().toISOString(),
        userId: user.id,
      };

      if (bookId) {
        // Export data for specific book
        const [progress, annotations] = await Promise.all([
          this.getProgress(bookId),
          this.getAnnotations(bookId),
        ]);

        exportData.books = [{
          bookId,
          progress,
          annotations,
        }];
      } else {
        // Export all user data with consistent mapping
        const { data: progressData } = await this.supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', user.id);

        const { data: annotationsData } = await this.supabase
          .from('annotations')
          .select('*')
          .eq('user_id', user.id);

        // Map to service DTOs for consistency
        exportData.progress = (progressData || []).map(mapDbProgressToService);
        exportData.annotations = (annotationsData || []).map(mapDbAnnotationToDomain);
      }

      return exportData;
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw error;
    }
  }

  /**
   * Sanitizes and maps reading progress for import
   */
  private sanitizeProgressForImport(progress: any, userId: string): any {
    return {
      user_id: userId,
      book_id: progress.book_id || progress.bookId,
      current_location: progress.current_location || progress.currentLocation || progress.position,
      progress_percentage: progress.progress_percentage || progress.progressPercentage || 0,
      reading_time_minutes: progress.reading_time_minutes || progress.readingTimeMinutes || progress.totalTimeMinutes || 0,
      last_read_at: progress.last_read_at || progress.lastReadAt || progress.lastRead || new Date().toISOString(),
    };
  }

  /**
   * Sanitizes and maps annotation for import
   */
  private sanitizeAnnotationForImport(annotation: any, userId: string): any {
    return {
      user_id: userId,
      book_id: annotation.book_id || annotation.bookId,
      annotation_type: annotation.annotation_type || annotation.type || 'note',
      content: annotation.content || '',
      note: annotation.note || null,
      location: annotation.location,
      color: annotation.color || '#ffeb3b',
      created_at: annotation.created_at || annotation.createdAt || new Date().toISOString(),
    };
  }

  /**
   * Imports user data from backup
   */
  async importUserData(data: any): Promise<void> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      // Import progress data with sanitization and error handling
      if (data.progress && Array.isArray(data.progress)) {
        const progressErrors: any[] = [];
        for (const progress of data.progress) {
          // Validate required fields
          if (!progress.book_id && !progress.bookId) {
            console.warn('Skipping progress entry without book_id');
            continue;
          }
          
          const sanitizedProgress = this.sanitizeProgressForImport(progress, user.id);
          
          try {
            await this.supabase
              .from('reading_progress')
              .upsert(sanitizedProgress, {
                onConflict: 'user_id,book_id',
              });
          } catch (e) {
            progressErrors.push({ bookId: sanitizedProgress.book_id, error: e });
          }
        }
        if (progressErrors.length) console.warn('Progress import errors:', progressErrors);
      }

      // Import annotations with sanitization and error handling
      if (data.annotations && Array.isArray(data.annotations)) {
        const annotationErrors: any[] = [];
        for (const annotation of data.annotations) {
          // Validate required fields
          if (!annotation.book_id && !annotation.bookId) {
            console.warn('Skipping annotation without book_id');
            continue;
          }
          if (!annotation.location) {
            console.warn('Skipping annotation without location');
            continue;
          }
          
          const sanitizedAnnotation = this.sanitizeAnnotationForImport(annotation, user.id);
          
          try {
            await this.supabase
              .from('annotations')
              .insert(sanitizedAnnotation);
          } catch (e) {
            annotationErrors.push({ bookId: sanitizedAnnotation.book_id, location: sanitizedAnnotation.location, error: e });
          }
        }
        if (annotationErrors.length) console.warn('Annotation import errors:', annotationErrors);
      }
    } catch (error) {
      console.error('Failed to import user data:', error);
      throw error;
    }
  }
}

export const readingService = new ReadingServiceImpl()