'use client';

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient, setupOfflineManager, restoreQueryClient } from '@/lib/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  // Setup offline manager and restore cache on mount
  React.useEffect(() => {
    setupOfflineManager();
    restoreQueryClient();

    // Persist cache on window unload
    const handleUnload = () => {
      const { persistQueryClient } = require('@/lib/react-query');
      persistQueryClient();
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UserProvider>
          <SettingsProvider>
            <NotificationProvider>
              {children}
              {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
              )}
            </NotificationProvider>
          </SettingsProvider>
        </UserProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};