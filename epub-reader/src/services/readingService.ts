import { ReadingProgress, Annotation } from '@/types'
import { ReadingService, AnnotationFilters, CreateAnnotationRequest } from '@/types/services'
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface ReadingSession {
  id?: string;
  bookId: string;
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

export class ReadingServiceImpl implements ReadingService {
  private supabase = createClient();
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();
  private activeSession: ReadingSession | null = null;
  private sessionTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Starts a new reading session
   */
  async startReadingSession(bookId: string, session: Partial<ReadingSession>): Promise<string> {
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

      this.activeSession = { id: data.id, bookId, ...session };
      
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
    if (!this.activeSession?.id) return;

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
        .eq('id', this.activeSession.id);
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }

  /**
   * Starts a timer for periodic session updates
   */
  private startSessionTimer(): void {
    this.stopSessionTimer();
    // Update session every 30 seconds
    this.sessionTimer = setInterval(() => this.updateSession(), 30000);
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
    if (!this.activeSession?.id) return;

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
        .eq('id', this.activeSession.id);

      this.activeSession = null;
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  async saveProgress(bookId: string, progress: ReadingProgress): Promise<void> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      // Update active session if exists
      if (this.activeSession?.bookId === bookId) {
        this.activeSession.endChapterId = progress.chapterId || undefined;
        this.activeSession.endCfi = progress.position || undefined;
        this.activeSession.endPercentage = progress.percentageComplete;
        this.activeSession.pagesRead = (this.activeSession.pagesRead || 0) + 1;
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

  async getProgress(bookId: string): Promise<ReadingProgress | null> {
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
        chapterId: data.chapter_id,
        position: data.current_location, // Fixed: was 'data.position'
        percentageComplete: data.progress_percentage, // Fixed: was 'data.percentage_complete'
        totalTimeMinutes: data.reading_time_minutes, // Fixed: was 'data.total_time_minutes'
        lastRead: data.last_read_at, // Fixed: was 'data.updated_at'
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

        if (existingErr && (existingErr as any).code !== 'PGRST116') {
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

      return data as Annotation;
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
        if (filters.chapterId) {
          query = query.eq('chapter_id', filters.chapterId);
        }
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as Annotation[];
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

      const { data, error } = await this.supabase
        .from('annotations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return data as Annotation;
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
  subscribeToProgressUpdates(
    bookId: string,
    onUpdate: (progress: ReadingProgress) => void
  ): () => void {
    try {
      const channelName = `progress:${bookId}`;
      
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
            if (payload.new) {
              const progress: ReadingProgress = {
                bookId: payload.new.book_id,
                chapterId: payload.new.chapter_id,
                position: payload.new.current_location,
                percentageComplete: payload.new.progress_percentage,
                totalTimeMinutes: payload.new.reading_time_minutes,
                lastRead: payload.new.last_read_at,
              };
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
            if (payload.new) {
              const progress: ReadingProgress = {
                bookId: payload.new.book_id,
                chapterId: payload.new.chapter_id,
                position: payload.new.current_location,
                percentageComplete: payload.new.progress_percentage,
                totalTimeMinutes: payload.new.reading_time_minutes,
                lastRead: payload.new.last_read_at,
              };
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
  async exportUserData(bookId?: string): Promise<any> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      const exportData: any = {
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
        // Export all user data
        const { data: progressData } = await this.supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', user.id);

        const { data: annotationsData } = await this.supabase
          .from('annotations')
          .select('*')
          .eq('user_id', user.id);

        exportData.progress = progressData;
        exportData.annotations = annotationsData;
      }

      return exportData;
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw error;
    }
  }

  /**
   * Imports user data from backup
   */
  async importUserData(data: any): Promise<void> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      // Import progress data
      if (data.progress && Array.isArray(data.progress)) {
        for (const progress of data.progress) {
          await this.supabase
            .from('reading_progress')
            .upsert({
              ...progress,
              user_id: user.id,
            }, {
              onConflict: 'user_id,book_id',
            });
        }
      }

      // Import annotations
      if (data.annotations && Array.isArray(data.annotations)) {
        for (const annotation of data.annotations) {
          const { id, ...annotationData } = annotation;
          await this.supabase
            .from('annotations')
            .insert({
              ...annotationData,
              user_id: user.id,
            });
        }
      }
    } catch (error) {
      console.error('Failed to import user data:', error);
      throw error;
    }
  }
}

export const readingService = new ReadingServiceImpl()