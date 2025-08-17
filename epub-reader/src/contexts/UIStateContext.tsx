"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

type SidebarType = 'toc' | 'annotations' | 'settings' | 'search' | 'ai' | null;

interface UIState {
  activeSidebar: SidebarType;
  sidebarHistory: SidebarType[];
}

interface UIStateContextType {
  uiState: UIState;
  openSidebar: (id: SidebarType) => void;
  closeSidebar: () => void;
  toggleSidebar: (id: SidebarType) => void;
  closeAllPanels: () => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [uiState, setUiState] = useState<UIState>({
    activeSidebar: null,
    sidebarHistory: [],
  });

  const openSidebar = useCallback((id: SidebarType) => {
    setUiState((prev) => ({
      activeSidebar: id,
      sidebarHistory: [...prev.sidebarHistory, prev.activeSidebar].filter(Boolean) as SidebarType[],
    }));
  }, []);

  const closeSidebar = useCallback(() => {
    setUiState((prev) => {
      const lastSidebar = prev.sidebarHistory[prev.sidebarHistory.length - 1] || null;
      return {
        activeSidebar: lastSidebar,
        sidebarHistory: prev.sidebarHistory.slice(0, -1),
      };
    });
  }, []);

  const toggleSidebar = useCallback((id: SidebarType) => {
    setUiState((prev) => {
      if (prev.activeSidebar === id) {
        // Close if already open
        return {
          activeSidebar: null,
          sidebarHistory: prev.sidebarHistory,
        };
      } else {
        // Open new sidebar, close any existing
        return {
          activeSidebar: id,
          sidebarHistory: prev.activeSidebar ? [...prev.sidebarHistory, prev.activeSidebar] : prev.sidebarHistory,
        };
      }
    });
  }, []);

  const closeAllPanels = useCallback(() => {
    setUiState({
      activeSidebar: null,
      sidebarHistory: [],
    });
  }, []);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && uiState.activeSidebar) {
        closeSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiState.activeSidebar, closeSidebar]);

  const value: UIStateContextType = {
    uiState,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    closeAllPanels,
  };

  return (
    <UIStateContext.Provider value={value}>
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
}

// Convenience hook for individual sidebars
export function useSidebar(sidebarId: SidebarType) {
  const { uiState, toggleSidebar, closeSidebar } = useUIState();
  
  const isOpen = uiState.activeSidebar === sidebarId;
  
  const open = () => toggleSidebar(sidebarId);
  const close = () => {
    if (isOpen) closeSidebar();
  };
  const toggle = () => toggleSidebar(sidebarId);
  
  return { isOpen, open, close, toggle };
}