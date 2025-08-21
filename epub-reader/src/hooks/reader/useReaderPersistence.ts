"use client";

import { useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { EnhancedReaderState, ReadingSettings } from './useEnhancedReaderState';

const supabase = createClient();

// Storage keys
const STORAGE_KEYS = {
  READING_SETTINGS: 'readerSettings',
  READING_PROGRESS: 'readingProgress',
  PANEL_PREFERENCES: 'panelPreferences',
} as const;

interface PersistedProgress {
  bookId: string;
  location: string;
  progress: number;
  chapterTitle: string;
  lastRead: string;
}

interface PersistedPanelPreferences {
  defaultPanelSize: 'sm' | 'md' | 'lg';
  rememberPanelState: boolean;
  autoCloseOnNavigation: boolean;
}

export function useReaderPersistence(state: EnhancedReaderState) {
  // Debounce settings updates to avoid excessive saves
  const debouncedSettings = useDebounce(state.settings, 1000);
  const debouncedProgress = useDebounce({
    bookId: state.book.id,
    location: state.book.currentLocation,
    progress: state.book.progress,
    chapterTitle: state.book.chapterTitle
  }, 2000);

  // Settings persistence
  const persistSettings = useCallback(async (settings: ReadingSettings) => {
    try {
      // Save to localStorage immediately
      localStorage.setItem(STORAGE_KEYS.READING_SETTINGS, JSON.stringify(settings));

      // Save to user profile (debounced)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            reading_preferences: settings,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.warn('Failed to sync settings to profile:', error);
        }
      }
    } catch (error) {
      console.error('Failed to persist settings:', error);
    }
  }, []);

  // Reading progress persistence
  const persistProgress = useCallback(async (progressData: {
    bookId: string;
    location: string;
    progress: number;
    chapterTitle: string;
  }) => {
    if (!progressData.bookId || !progressData.location) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const progressRecord: PersistedProgress = {
        ...progressData,
        lastRead: new Date().toISOString()
      };

      // Save to localStorage
      const existingProgress = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.READING_PROGRESS) || '{}'
      );
      existingProgress[progressData.bookId] = progressRecord;
      localStorage.setItem(STORAGE_KEYS.READING_PROGRESS, JSON.stringify(existingProgress));

      // Save to database
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: progressData.bookId,
          current_location: progressData.location,
          progress_percentage: Math.round(progressData.progress * 100),
          reading_time_minutes: 0, // Will be tracked separately
          last_read_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,book_id'
        });

      if (error) {
        console.warn('Failed to sync progress to database:', error);
      }
    } catch (error) {
      console.error('Failed to persist progress:', error);
    }
  }, []);

  // Load initial settings
  const loadInitialSettings = useCallback(async (): Promise<ReadingSettings | null> => {
    try {
      // First, try localStorage for immediate response
      const localSettings = localStorage.getItem(STORAGE_KEYS.READING_SETTINGS);
      let settings = localSettings ? JSON.parse(localSettings) : null;

      // Then, try to load from user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('reading_preferences')
          .eq('id', user.id)
          .single();

        if (profile?.reading_preferences) {
          settings = {
            ...settings,
            ...profile.reading_preferences
          };
          
          // Update localStorage with the merged settings
          localStorage.setItem(STORAGE_KEYS.READING_SETTINGS, JSON.stringify(settings));
        }
      }

      return settings;
    } catch (error) {
      console.error('Failed to load initial settings:', error);
      return null;
    }
  }, []);

  // Load reading progress for a specific book
  const loadBookProgress = useCallback(async (bookId: string): Promise<PersistedProgress | null> => {
    if (!bookId) return null;

    try {
      // First, check localStorage
      const localProgress = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.READING_PROGRESS) || '{}'
      );
      let progress = localProgress[bookId] || null;

      // Then, try database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: dbProgress } = await supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .single();

        if (dbProgress) {
          const dbProgressFormatted: PersistedProgress = {
            bookId: dbProgress.book_id,
            location: dbProgress.position,
            progress: dbProgress.progress_percentage / 100,
            chapterTitle: dbProgress.metadata?.chapterTitle || '',
            lastRead: dbProgress.last_read_at
          };

          // Use the more recent progress
          if (!progress || new Date(dbProgressFormatted.lastRead) > new Date(progress.lastRead)) {
            progress = dbProgressFormatted;
            
            // Update localStorage
            localProgress[bookId] = progress;
            localStorage.setItem(STORAGE_KEYS.READING_PROGRESS, JSON.stringify(localProgress));
          }
        }
      }

      return progress;
    } catch (error) {
      console.error('Failed to load book progress:', error);
      return null;
    }
  }, []);

  // Auto-save settings when they change
  useEffect(() => {
    if (debouncedSettings) {
      persistSettings(debouncedSettings);
    }
  }, [debouncedSettings, persistSettings]);

  // Auto-save progress when it changes
  useEffect(() => {
    if (debouncedProgress.bookId && debouncedProgress.location) {
      persistProgress(debouncedProgress);
    }
  }, [debouncedProgress, persistProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Force save current state before unmounting
      if (state.book.id && state.book.currentLocation) {
        persistProgress({
          bookId: state.book.id,
          location: state.book.currentLocation,
          progress: state.book.progress,
          chapterTitle: state.book.chapterTitle
        });
      }
    };
  }, [state.book, persistProgress]);

  // Export utilities for manual operations
  return useMemo(() => ({
    loadInitialSettings,
    loadBookProgress,
    persistSettings,
    persistProgress,
    
    // Clear all data (for logout, etc.)
    clearAllData: () => {
      localStorage.removeItem(STORAGE_KEYS.READING_SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.READING_PROGRESS);
      localStorage.removeItem(STORAGE_KEYS.PANEL_PREFERENCES);
    },
    
    // Export specific book data (for backup, etc.)
    exportBookData: (bookId: string) => {
      const progressData = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.READING_PROGRESS) || '{}'
      );
      return progressData[bookId] || null;
    }
  }), [loadInitialSettings, loadBookProgress, persistSettings, persistProgress]);
}

export type { PersistedProgress, PersistedPanelPreferences };