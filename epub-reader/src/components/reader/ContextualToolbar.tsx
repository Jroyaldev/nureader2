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
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  CheckIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import React, { useState, useEffect, useRef } from 'react';

interface ContextualToolbarProps {
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
  
  // Fullscreen
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  
  // Visibility
  isVisible?: boolean;
  autoHide?: boolean;
  isMobile?: boolean;
  
  // Pin state
  isPinned?: boolean;
  onTogglePin?: () => void;
}

const themeConfigs = {
  light: { icon: SunIcon, label: 'Light', bg: 'rgb(255, 255, 255)', fg: 'rgb(28, 32, 36)' },
  dark: { icon: MoonIcon, label: 'Dark', bg: 'rgb(16, 18, 21)', fg: 'rgb(245, 245, 247)' }
} as const;

export default function ContextualToolbar({
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
  isFullscreen,
  onToggleFullscreen,
  isVisible = true,
  autoHide = true,
  isMobile = false,
  isPinned = true,
  onTogglePin
}: ContextualToolbarProps) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  
  // Use refs to avoid re-renders and dependency issues
  const lastScrollYRef = useRef(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();
  const mouseInZoneRef = useRef(false);
  
  // Stable auto-hide logic without bouncing
  useEffect(() => {
    // Skip auto-hide on mobile or when pinned
    if (!autoHide || isMobile || isPinned) {
      setToolbarVisible(true);
      return;
    }
    
    const showToolbar = () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      setToolbarVisible(true);
    };
    
    const scheduleHide = (delay: number = 3000) => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        // Only hide if not hovering and mouse not in zone
        if (!isHovering && !mouseInZoneRef.current) {
          setToolbarVisible(false);
        }
      }, delay);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      const TRIGGER_ZONE = 80; // Smaller, more precise trigger zone
      const isNearTop = e.clientY < TRIGGER_ZONE;
      
      if (isNearTop) {
        mouseInZoneRef.current = true;
        showToolbar();
        // Don't schedule hide while in zone
      } else {
        if (mouseInZoneRef.current) {
          // Just left the zone
          mouseInZoneRef.current = false;
          if (!isHovering) {
            scheduleHide(2000); // 2 second delay after leaving zone
          }
        }
      }
    };
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;
      
      // Only react to significant scroll
      if (Math.abs(scrollDelta) > 10) {
        if (scrollDelta < 0) {
          // Scrolling up - show toolbar
          showToolbar();
          scheduleHide(3000);
        } else if (currentScrollY > 100) {
          // Scrolling down and not near top
          if (!isHovering && !mouseInZoneRef.current) {
            scheduleHide(500); // Quick hide on scroll down
          }
        }
        lastScrollYRef.current = currentScrollY;
      }
    };
    
    // Initial setup
    setToolbarVisible(true);
    scheduleHide(5000); // Show for 5 seconds initially
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [autoHide, isMobile, isPinned, isHovering]); // Minimal dependencies
  
  const handleThemeSelect = (theme: 'light' | 'dark') => {
    onThemeChange(theme);
    setShowThemeMenu(false);
  };
  
  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(32, fontSize + delta));
    onFontSizeChange(newSize);
  };
  
  // Mobile bottom sheet implementation
  if (isMobile) {
    return (
      <>
        {/* Floating Mini Progress Bar */}
        <div className={`fixed top-0 left-0 right-0 z-[75] transition-all duration-300 ${
          toolbarVisible ? 'translate-y-0' : '-translate-y-full'
        }`}>
          <div className="h-1 reader-progress-track">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Bottom Navigation Bar - Always visible on mobile */}
        <div className={`fixed bottom-0 left-0 right-0 z-[80] transition-all duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}>
          <div className="bg-gradient-to-t from-[rgb(var(--bg))] via-[rgb(var(--bg))]/98 to-transparent pt-8 pb-safe">
            <div className="mobile-sheet rounded-t-3xl">
              {/* Progress Section */}
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted truncate flex-1 mr-2">{chapterTitle || 'Loading...'}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium tabular-nums">{progress}%</span>
                    {timeLeft && (
                      <>
                        <span className="text-muted">•</span>
                        <span className="text-muted">{timeLeft} left</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="reader-progress-track h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              
              {/* Primary Controls */}
              <div className="flex items-center justify-between px-3 py-2 border-t reader-divider">
                {/* Navigation */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={onNavigateHome}
                    className="p-3 rounded-xl reader-btn-hover touch-manipulation font-inter"
                    aria-label="Library"
                  >
                    <HomeIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onNavigatePrev}
                    disabled={!canGoPrev}
                    className="p-3 rounded-xl reader-btn-hover disabled:opacity-30 touch-manipulation font-inter"
                    aria-label="Previous"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onNavigateNext}
                    disabled={!canGoNext}
                    className="p-3 rounded-xl reader-btn-hover disabled:opacity-30 touch-manipulation font-inter"
                    aria-label="Next"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={onToggleBookmark}
                    className={`p-3 rounded-xl reader-btn-hover touch-manipulation font-inter ${
                      isBookmarked ? 'text-blue-500' : ''
                    }`}
                    aria-label="Bookmark"
                  >
                    {isBookmarked ? <BookmarkSolidIcon className="w-5 h-5" /> : <BookmarkIcon className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    className="p-3 rounded-xl reader-btn-hover touch-manipulation font-inter"
                    aria-label="Theme"
                  >
                    {React.createElement(themeConfigs[currentTheme].icon, { className: "w-5 h-5" })}
                  </button>
                  <button
                    onClick={onToggleToc}
                    className={`p-3 rounded-xl reader-btn-hover touch-manipulation font-inter ${
                      showToc ? 'reader-btn-active' : ''
                    }`}
                    aria-label="Contents"
                  >
                    <Bars3Icon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onToggleSettings}
                    className={`p-3 rounded-xl reader-btn-hover touch-manipulation font-inter ${
                      showSettings ? 'reader-btn-active' : ''
                    }`}
                    aria-label="Settings"
                  >
                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                  </button>
                  {onToggleAIChat && (
                    <button
                      onClick={onToggleAIChat}
                      className={`p-3 rounded-xl reader-btn-hover touch-manipulation font-inter ${
                        showAIChat ? 'reader-btn-active' : ''
                      }`}
                      aria-label="AI Assistant"
                    >
                      <SparklesIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Theme Picker Overlay */}
        {showThemeMenu && (
          <div className="fixed inset-0 z-[85] flex items-end justify-center p-4 animate-fade-in">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-md"
              onClick={() => setShowThemeMenu(false)}
            />
            <div className="relative w-full max-w-sm bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-3xl p-6 animate-slide-up shadow-2xl border border-black/10 dark:border-white/10 font-inter">
              <h3 className="text-lg font-semibold mb-4">Reading Theme</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(themeConfigs).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleThemeSelect(key as 'light' | 'dark')}
                    className={`relative p-4 rounded-2xl border-2 transition-all touch-manipulation font-inter ${
                      currentTheme === key 
                        ? 'border-blue-500 shadow-lg scale-105' 
                        : 'border-white/10 dark:border-gray-700/20 active:border-white/20 dark:active:border-gray-700/30'
                    }`}
                    style={{ backgroundColor: config.bg }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {React.createElement(config.icon, { 
                        className: "w-6 h-6",
                        style: { color: config.fg }
                      })}
                      <span className="text-sm font-medium" style={{ color: config.fg }}>
                        {config.label}
                      </span>
                    </div>
                    {currentTheme === key && (
                      <div className="absolute top-2 right-2">
                        <CheckIcon className="w-4 h-4 text-blue-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
  
  // Desktop floating toolbar
  return (
    <>
      {/* Theme Menu Dropdown - Rendered outside toolbar for proper visibility */}
      {showThemeMenu && (
        <div 
          className="fixed bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-2xl p-3 shadow-2xl animate-scale-in border border-black/10 dark:border-white/10 font-inter"
          style={{
            minWidth: '260px',
            zIndex: 90,
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h4 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">Theme</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(themeConfigs).map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleThemeSelect(key as 'light' | 'dark')}
                className={`relative px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 touch-manipulation font-inter ${
                  currentTheme === key 
                    ? 'reader-btn-active shadow-sm' 
                    : 'reader-btn-hover'
                }`}
              >
                {React.createElement(config.icon, { className: "w-4 h-4" })}
                <span className="text-sm font-medium">{config.label}</span>
                {currentTheme === key && (
                  <CheckIcon className="w-3.5 h-3.5 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Top Floating Toolbar */}
      <div 
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[80] transition-all ${
          toolbarVisible && isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-8 pointer-events-none'
        }`}
        style={{
          transitionDuration: toolbarVisible ? '300ms' : '500ms',
          transitionTimingFunction: toolbarVisible ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'cubic-bezier(0.4, 0, 0.6, 1)'
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          // Don't immediately hide when mouse leaves
          if (autoHide && !isPinned) {
            setTimeout(() => {
              if (!isHovering) setToolbarVisible(false);
            }, 2000);
          }
        }}
      >
        <div className="reader-floating rounded-2xl shadow-2xl" style={{
          animation: toolbarVisible ? 'slide-down 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
        }}>
          {/* Compact Progress Bar */}
          {chapterTitle && (
            <div className="px-6 pt-4 pb-3">
              <div className="flex items-center gap-4">
                <h4 className="text-sm font-semibold truncate max-w-xs opacity-90">{chapterTitle}</h4>
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <div className="h-1.5 reader-progress-track rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 via-blue-500/85 to-blue-400 rounded-full transition-all duration-500 ease-out relative"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-[rgb(var(--fg))]/70 min-w-[3rem]">
                    {progress}%
                  </span>
                  {timeLeft && (
                    <span className="text-xs text-[rgb(var(--fg))]/50 whitespace-nowrap font-medium">
                      {timeLeft} left
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 reader-divider-h" />
            </div>
          )}
          
          {/* Main Controls */}
          <div className="flex items-center p-3">
            {/* Navigation Group */}
            <div className="flex items-center gap-1 px-2">
              <button
                onClick={onNavigateHome}
                className="p-2.5 rounded-xl reader-btn-hover group touch-manipulation font-inter"
                aria-label="Library"
                title="Back to Library"
              >
                <HomeIcon className="w-4 h-4 group-active:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={onNavigatePrev}
                disabled={!canGoPrev}
                className="p-2.5 rounded-xl reader-btn-hover disabled:opacity-30 disabled:cursor-not-allowed group touch-manipulation font-inter"
                aria-label="Previous"
                title="Previous Page (←)"
              >
                <ChevronLeftIcon className="w-4 h-4 group-active:-translate-x-0.5 transition-transform duration-200" />
              </button>
              <button
                onClick={onNavigateNext}
                disabled={!canGoNext}
                className="p-2.5 rounded-xl reader-btn-hover disabled:opacity-30 disabled:cursor-not-allowed group touch-manipulation font-inter"
                aria-label="Next"
                title="Next Page (→)"
              >
                <ChevronRightIcon className="w-4 h-4 group-active:translate-x-0.5 transition-transform duration-200" />
              </button>
            </div>
            
            <div className="reader-divider" />
            
            {/* Display Controls */}
            <div className="flex items-center gap-1 px-2">
              {/* Font Size */}
              <div className="flex items-center gap-0.5 bg-[rgb(var(--bg))]/30 rounded-xl p-0.5">
                <button
                  onClick={() => adjustFontSize(-2)}
                  className="px-2.5 py-2 rounded-lg reader-btn-hover group touch-manipulation font-inter"
                  aria-label="Decrease font"
                  title="Decrease Font Size"
                >
                  <span className="text-xs font-bold opacity-80 group-active:opacity-100 transition-opacity">A−</span>
                </button>
                <button
                  onClick={() => setShowFontMenu(!showFontMenu)}
                  className="px-3 py-1.5 rounded-lg touch-manipulation font-inter"
                  title="Font Size"
                >
                  <span className="text-[11px] font-semibold tabular-nums opacity-70">{fontSize}px</span>
                </button>
                <button
                  onClick={() => adjustFontSize(2)}
                  className="px-2.5 py-2 rounded-lg reader-btn-hover group touch-manipulation font-inter"
                  aria-label="Increase font"
                  title="Increase Font Size"
                >
                  <span className="text-xs font-bold opacity-80 group-active:opacity-100 transition-opacity">A+</span>
                </button>
              </div>
              
              {/* Theme Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  className="p-2.5 rounded-xl reader-btn-hover group touch-manipulation font-inter"
                  aria-label="Theme"
                  title={`Theme: ${themeConfigs[currentTheme].label}`}
                >
                  {React.createElement(themeConfigs[currentTheme].icon, { 
                    className: "w-4 h-4 group-active:scale-110 transition-transform duration-200" 
                  })}
                </button>
                
              </div>
              
              {/* Fullscreen */}
              <button
                onClick={onToggleFullscreen}
                className="p-2.5 rounded-xl reader-btn-hover group touch-manipulation font-inter"
                aria-label="Fullscreen"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="w-4 h-4 group-active:scale-110 transition-transform duration-200" />
                ) : (
                  <ArrowsPointingOutIcon className="w-4 h-4 group-active:scale-110 transition-transform duration-200" />
                )}
              </button>
            </div>
            
            <div className="reader-divider" />
            
            {/* Tools Group */}
            <div className="flex items-center gap-1 px-2">
              {/* Pin/Unpin Button - Desktop only */}
              {onTogglePin && (
                <button
                  onClick={onTogglePin}
                  className={`p-2.5 rounded-xl transition-all duration-300 group touch-manipulation font-inter ${
                    isPinned 
                      ? 'bg-blue-500/10 text-blue-500 active:bg-blue-500/15'
        : 'reader-btn-hover opacity-60 active:opacity-100'
                  }`}
                  aria-label={isPinned ? "Unpin toolbar" : "Pin toolbar"}
                  title={isPinned ? "Unpin toolbar (auto-hide when idle)" : "Pin toolbar (always visible)"}
                >
                  {isPinned ? (
                    <LockClosedIcon className="w-4 h-4 transition-transform duration-300 group-active:scale-110" />
                  ) : (
                    <LockOpenIcon className="w-4 h-4 transition-transform duration-300 group-active:scale-110" />
                  )}
                </button>
              )}
              
              <div className="reader-divider" />
              <button
                onClick={onToggleSearch}
                className={`p-2.5 rounded-xl reader-btn-hover group touch-manipulation font-inter ${
                  showSearch ? 'reader-btn-active' : ''
                }`}
                aria-label="Search"
                title="Search (Ctrl+F)"
              >
                <MagnifyingGlassIcon className="w-4 h-4 group-active:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={onToggleBookmark}
                className={`p-2.5 rounded-xl reader-btn-hover group touch-manipulation font-inter ${
                  isBookmarked ? 'text-blue-500' : ''
                }`}
                aria-label="Bookmark"
                title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
              >
                {isBookmarked ? (
                  <BookmarkSolidIcon className="w-4 h-4 group-active:scale-125 transition-all duration-200 animate-bookmark-add" />
                ) : (
                  <BookmarkIcon className="w-4 h-4 group-active:scale-110 transition-transform duration-200" />
                )}
              </button>
              <button
                onClick={onToggleToc}
                className={`p-2.5 rounded-xl reader-btn-hover group touch-manipulation font-inter ${
                  showToc ? 'reader-btn-active' : ''
                }`}
                aria-label="Contents"
                title="Table of Contents"
              >
                <Bars3Icon className="w-4 h-4 group-active:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={onToggleAnnotations}
                className={`p-2.5 rounded-xl reader-btn-hover group touch-manipulation font-inter ${
                  showAnnotations ? 'reader-btn-active' : ''
                }`}
                aria-label="Annotations"
                title="Annotations & Notes"
              >
                <PencilSquareIcon className="w-4 h-4 group-active:scale-110 transition-transform duration-200" />
              </button>
              {onToggleAIChat && (
                <button
                  onClick={onToggleAIChat}
                  className={`p-2.5 rounded-xl reader-btn-hover group touch-manipulation font-inter ${
                    showAIChat ? 'reader-btn-active' : ''
                  }`}
                  aria-label="AI Assistant"
                  title="AI Assistant (Cmd/Ctrl+J)"
                >
                  <SparklesIcon className="w-4 h-4 group-active:scale-110 transition-transform duration-200" />
                </button>
              )}
              <button
                onClick={onToggleSettings}
                className={`p-2.5 rounded-xl reader-btn-hover group touch-manipulation font-inter ${
                  showSettings ? 'reader-btn-active' : ''
                }`}
                aria-label="Settings"
                title="Reading Settings"
              >
                <Cog6ToothIcon className="w-4 h-4 group-active:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Minimal Progress Indicator (when toolbar is hidden) */}
      {!toolbarVisible && (
        <div className="fixed top-0 left-0 right-0 z-[75] h-0.5 reader-progress-track">
          <div 
            className="h-full bg-blue-500/40 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </>
  );
}
