"use client";

import {
  BookOpenIcon,
  MoonIcon,
  SunIcon,
  Bars3Icon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  BookmarkIcon,
  SparklesIcon,
  XMarkIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import React, { useState, useEffect, useRef } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface MobileToolbarProps {
  // Navigation
  onNavigateHome: () => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  
  // Theme & Display
  currentTheme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  
  // Panels
  showToc: boolean;
  showAnnotations: boolean;
  showSettings: boolean;
  showSearch: boolean;
  showAIChat?: boolean;
  onToggleToc: () => void;
  onToggleAnnotations: () => void;
  onToggleSettings: () => void;
  onToggleSearch: () => void;
  onToggleAIChat?: () => void;
  
  // Progress
  progress: number;
  chapterTitle?: string;
  timeLeft?: string;
  
  // Bookmarks
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  
  // Visibility
  isVisible?: boolean;
}

const themeConfigs = {
  light: { icon: SunIcon, label: 'Light' },
  dark: { icon: MoonIcon, label: 'Dark' }
} as const;

export default function MobileToolbar({
  onNavigateHome,
  onNavigatePrev,
  onNavigateNext,
  canGoNext,
  canGoPrev,
  currentTheme,
  onThemeChange,
  fontSize,
  onFontSizeChange,
  showToc,
  showAnnotations,
  showSettings,
  showSearch,
  showAIChat = false,
  onToggleToc,
  onToggleAnnotations,
  onToggleSettings,
  onToggleSearch,
  onToggleAIChat,
  progress,
  chapterTitle,
  timeLeft,
  isBookmarked,
  onToggleBookmark,
  isVisible = true
}: MobileToolbarProps) {
  const { isMobile } = useBreakpoint();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout>();

  // Handle scroll behavior for auto-hide
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;
      
      // Clear existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      
      // Show toolbar when scrolling up or at top
      if (scrollDelta < -10 || currentScrollY < 50) {
        setIsCollapsed(false);
      }
      // Hide toolbar when scrolling down significantly
      else if (scrollDelta > 20 && currentScrollY > 100) {
        scrollTimeout.current = setTimeout(() => {
          setIsCollapsed(true);
        }, 150);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(32, fontSize + delta));
    onFontSizeChange(newSize);
  };

  const toggleTheme = () => {
    onThemeChange(currentTheme === 'light' ? 'dark' : 'light');
  };

  if (!isVisible || !isMobile) return null;

  return (
    <>
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-black/5 dark:bg-white/5">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Mobile Toolbar */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-black/10 dark:border-white/20 shadow-2xl font-inter ${
          isCollapsed ? 'translate-y-[-100%]' : 'translate-y-0'
        }`}
        style={{
          paddingTop: 'env(safe-area-inset-top)'
        }}
      >
        {/* Chapter Info Bar */}
        {chapterTitle && (
          <div className="px-4 py-2 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted truncate max-w-[200px] font-inter">
                {chapterTitle}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted font-inter">
                <span>{Math.round(progress)}%</span>
                {timeLeft && (
                  <span className="hidden xs:inline">{timeLeft}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Controls */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={onNavigateHome}
              className="mobile-btn touch-target rounded-xl bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 active:bg-white/30 dark:active:bg-white/30 transition-all duration-200 touch-manipulation font-inter no-tap-highlight"
              aria-label="Library"
            >
              <HomeIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onNavigatePrev}
              disabled={!canGoPrev}
              className="mobile-btn touch-target rounded-xl bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 active:bg-white/30 dark:active:bg-white/30 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 touch-manipulation font-inter no-tap-highlight"
              aria-label="Previous"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onNavigateNext}
              disabled={!canGoNext}
              className="mobile-btn p-2.5 rounded-xl bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 active:bg-white/30 dark:active:bg-white/30 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 touch-manipulation font-inter"
              aria-label="Next"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Center: Primary Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleSearch}
              className={`mobile-btn p-2.5 rounded-xl transition-all duration-200 touch-manipulation font-inter ${
                showSearch 
                  ? 'bg-blue-500/20 text-blue-500' 
                  : 'bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 active:bg-white/30 dark:active:bg-white/30'
              }`}
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleToc}
              className={`mobile-btn p-2.5 rounded-xl transition-all duration-200 touch-manipulation font-inter ${
                showToc 
                  ? 'bg-blue-500/20 text-blue-500' 
                  : 'bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 active:bg-white/30 dark:active:bg-white/30'
              }`}
              aria-label="Contents"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleBookmark}
              className={`mobile-btn p-2.5 rounded-xl transition-all duration-200 touch-manipulation font-inter ${
                isBookmarked 
                  ? 'bg-yellow-500/20 text-yellow-500' 
                  : 'bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 active:bg-white/30 dark:active:bg-white/30'
              }`}
              aria-label="Bookmark"
            >
              {isBookmarked ? (
                <BookmarkSolidIcon className="w-5 h-5" />
              ) : (
                <BookmarkIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Right: More Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="mobile-btn p-2.5 rounded-xl bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 active:bg-white/30 dark:active:bg-white/30 transition-all duration-200 touch-manipulation font-inter"
              aria-label="More options"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>

            {/* More Menu Dropdown */}
            {showMoreMenu && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-[95] bg-black/20 backdrop-blur-sm"
                  onClick={() => setShowMoreMenu(false)}
                />
                
                {/* Menu */}
                <div className="absolute top-full right-0 mt-2 z-[96] w-56 bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-black/10 dark:border-white/20 rounded-2xl p-2 shadow-2xl font-inter">
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        onToggleAnnotations();
                        setShowMoreMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 touch-manipulation font-inter ${
                        showAnnotations 
                          ? 'bg-blue-500/20 text-blue-500' 
                          : 'hover:bg-white/20 dark:hover:bg-white/10 active:bg-white/30 dark:active:bg-white/20'
                      }`}
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                      <span className="font-medium">Annotations</span>
                    </button>
                    
                    {onToggleAIChat && (
                      <button
                        onClick={() => {
                          onToggleAIChat();
                          setShowMoreMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 touch-manipulation font-inter ${
                          showAIChat 
                            ? 'bg-purple-500/20 text-purple-500' 
                            : 'hover:bg-white/20 dark:hover:bg-white/10 active:bg-white/30 dark:active:bg-white/20'
                        }`}
                      >
                        <SparklesIcon className="w-5 h-5" />
                        <span className="font-medium">AI Assistant</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        onToggleSettings();
                        setShowMoreMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 touch-manipulation font-inter ${
                        showSettings 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'hover:bg-white/20 dark:hover:bg-white/10 active:bg-white/30 dark:active:bg-white/20'
                      }`}
                    >
                      <Cog6ToothIcon className="w-5 h-5" />
                      <span className="font-medium">Settings</span>
                    </button>
                    
                    <div className="h-px bg-black/10 dark:bg-white/10 my-2" />
                    
                    <button
                      onClick={() => {
                        toggleTheme();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/20 dark:hover:bg-white/10 active:bg-white/30 dark:active:bg-white/20 transition-all duration-200 touch-manipulation font-inter"
                    >
                      {React.createElement(themeConfigs[currentTheme].icon, { className: "w-5 h-5" })}
                      <span className="font-medium">{themeConfigs[currentTheme].label} Theme</span>
                    </button>
                    
                    <div className="flex items-center gap-2 px-3 py-2.5 font-inter">
                      <span className="text-sm font-medium text-muted flex-1">Font Size</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjustFontSize(-2)}
                          className="w-8 h-8 rounded-lg bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 active:bg-white/30 dark:active:bg-white/30 flex items-center justify-center transition-all duration-200 touch-manipulation font-inter"
                        >
                          <span className="text-sm font-bold">A−</span>
                        </button>
                        <span className="text-sm font-medium tabular-nums min-w-[2.5rem] text-center font-inter">
                          {fontSize}px
                        </span>
                        <button
                          onClick={() => adjustFontSize(2)}
                          className="w-8 h-8 rounded-lg bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 active:bg-white/30 dark:active:bg-white/30 flex items-center justify-center transition-all duration-200 touch-manipulation font-inter"
                        >
                          <span className="text-sm font-bold">A+</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from hiding under toolbar */}
      <div 
        className={`transition-all duration-300 ease-out ${
          isCollapsed ? 'h-1' : 'h-20'
        }`}
        style={{
          paddingTop: 'env(safe-area-inset-top)'
        }}
      />
    </>
  );
}