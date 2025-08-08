'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser } from './UserContext';

export interface AppSettings {
  // Reading settings
  reading: {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    marginHorizontal: number;
    marginVertical: number;
    textAlign: 'left' | 'justify';
    columnCount: 1 | 2;
    scrollMode: 'paginated' | 'scrolled';
    autoBookmark: boolean;
    highlightLinks: boolean;
  };
  
  // Display settings
  display: {
    showProgress: boolean;
    showClock: boolean;
    showBattery: boolean;
    showPageNumber: boolean;
    fullscreenReading: boolean;
    keepScreenOn: boolean;
  };
  
  // Library settings
  library: {
    viewMode: 'grid' | 'list';
    sortBy: 'title' | 'author' | 'lastOpened' | 'dateAdded';
    sortOrder: 'asc' | 'desc';
    showCollections: boolean;
    showReadingProgress: boolean;
    coverSize: 'small' | 'medium' | 'large';
  };
  
  // Sync settings
  sync: {
    autoSync: boolean;
    syncInterval: number; // in seconds
    syncOnWifi: boolean;
    backupAnnotations: boolean;
  };
  
  // Accessibility settings
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    focusIndicator: boolean;
    screenReaderMode: boolean;
    keyboardShortcuts: boolean;
  };
  
  // Notification settings
  notifications: {
    readingReminders: boolean;
    goalAchievements: boolean;
    newFeatures: boolean;
    systemUpdates: boolean;
  };
}

const defaultSettings: AppSettings = {
  reading: {
    fontSize: 16,
    fontFamily: 'Georgia, serif',
    lineHeight: 1.6,
    marginHorizontal: 60,
    marginVertical: 40,
    textAlign: 'justify',
    columnCount: 1,
    scrollMode: 'paginated',
    autoBookmark: true,
    highlightLinks: true,
  },
  display: {
    showProgress: true,
    showClock: false,
    showBattery: false,
    showPageNumber: true,
    fullscreenReading: false,
    keepScreenOn: false,
  },
  library: {
    viewMode: 'grid',
    sortBy: 'lastOpened',
    sortOrder: 'desc',
    showCollections: true,
    showReadingProgress: true,
    coverSize: 'medium',
  },
  sync: {
    autoSync: true,
    syncInterval: 300, // 5 minutes
    syncOnWifi: true,
    backupAnnotations: true,
  },
  accessibility: {
    reduceMotion: false,
    highContrast: false,
    focusIndicator: true,
    screenReaderMode: false,
    keyboardShortcuts: true,
  },
  notifications: {
    readingReminders: true,
    goalAchievements: true,
    newFeatures: true,
    systemUpdates: false,
  },
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (section: keyof AppSettings, updates: any) => void;
  resetSettings: (section?: keyof AppSettings) => void;
  exportSettings: () => string;
  importSettings: (data: string) => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: React.ReactNode;
  storageKey?: string;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
  storageKey = 'app-settings',
}) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const { user, profile } = useUser();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [user]);

  // Auto-save settings
  useEffect(() => {
    if (settings !== defaultSettings) {
      const timer = setTimeout(() => {
        saveSettings();
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(timer);
    }
  }, [settings]);

  // Load settings from storage
  const loadSettings = async () => {
    try {
      // First try to load from user profile if logged in
      if (user && profile?.preferences?.appSettings) {
        setSettings(profile.preferences.appSettings as AppSettings);
        return;
      }

      // Fall back to local storage
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new settings
        setSettings({
          ...defaultSettings,
          ...parsed,
          reading: { ...defaultSettings.reading, ...parsed.reading },
          display: { ...defaultSettings.display, ...parsed.display },
          library: { ...defaultSettings.library, ...parsed.library },
          sync: { ...defaultSettings.sync, ...parsed.sync },
          accessibility: { ...defaultSettings.accessibility, ...parsed.accessibility },
          notifications: { ...defaultSettings.notifications, ...parsed.notifications },
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // Save settings to storage
  const saveSettings = async () => {
    try {
      // Save to local storage
      localStorage.setItem(storageKey, JSON.stringify(settings));
      
      // Save to user profile if logged in
      if (user) {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        
        await supabase
          .from('profiles')
          .update({
            preferences: {
              ...profile?.preferences,
              appSettings: settings,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  // Update settings section
  const updateSettings = useCallback((
    section: keyof AppSettings,
    updates: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates,
      },
    }));
  }, []);

  // Reset settings
  const resetSettings = useCallback((section?: keyof AppSettings) => {
    if (section) {
      setSettings(prev => ({
        ...prev,
        [section]: defaultSettings[section],
      }));
    } else {
      setSettings(defaultSettings);
    }
  }, []);

  // Export settings as JSON
  const exportSettings = useCallback(() => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  // Import settings from JSON
  const importSettings = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      
      // Validate structure
      if (parsed.reading && parsed.display && parsed.library) {
        setSettings({
          ...defaultSettings,
          ...parsed,
        });
      } else {
        throw new Error('Invalid settings format');
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }, []);

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    saveSettings,
    loadSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Helper hooks for specific settings
export const useReadingSettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    settings: settings.reading,
    updateSettings: (updates: Partial<AppSettings['reading']>) =>
      updateSettings('reading', updates),
  };
};

export const useLibrarySettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    settings: settings.library,
    updateSettings: (updates: Partial<AppSettings['library']>) =>
      updateSettings('library', updates),
  };
};

export const useAccessibilitySettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    settings: settings.accessibility,
    updateSettings: (updates: Partial<AppSettings['accessibility']>) =>
      updateSettings('accessibility', updates),
  };
};