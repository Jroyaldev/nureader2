"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  DocumentTextIcon,
  ShareIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
  CheckIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

interface ContextualToolbarProps {
  // Navigation
  onNavigateHome: () => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  
  // Theme & Display
  currentTheme: 'light' | 'dark' | 'sepia' | 'night';
  onThemeChange: (theme: 'light' | 'dark' | 'sepia' | 'night') => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  
  // Panels
  showToc: boolean;
  showAnnotations: boolean;
  showSettings: boolean;
  showSearch: boolean;
  onToggleToc: () => void;
  onToggleAnnotations: () => void;
  onToggleSettings: () => void;
  onToggleSearch: () => void;
  
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
  light: { icon: SunIcon, label: 'Light', bg: 'rgb(252, 252, 253)', fg: 'rgb(28, 32, 36)' },
  dark: { icon: MoonIcon, label: 'Dark', bg: 'rgb(16, 18, 21)', fg: 'rgb(245, 245, 247)' },
  sepia: { icon: SparklesIcon, label: 'Sepia', bg: 'rgb(244, 236, 216)', fg: 'rgb(92, 75, 55)' },
  night: { icon: BookOpenIcon, label: 'Night', bg: 'rgb(0, 0, 0)', fg: 'rgb(136, 136, 136)' }
};

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
  onToggleToc,
  onToggleAnnotations,
  onToggleSettings,
  onToggleSearch,
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
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  
  // Auto-hide logic for desktop with improved persistence
  useEffect(() => {
    if (!autoHide || isMobile) return;
    
    let hideTimeout: NodeJS.Timeout;
    let showTimeout: NodeJS.Timeout;
    
    const handleMouseMove = (e: MouseEvent) => {
      const isNearTop = e.clientY < 150; // Increased trigger zone
      const isNearBottom = e.clientY > window.innerHeight - 150;
      
      if (isNearTop || isNearBottom || isHovering) {
        clearTimeout(hideTimeout);
        clearTimeout(showTimeout);
        // Immediate show
        setToolbarVisible(true);
      } else {
        // Longer delay before hiding (5 seconds)
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          if (!isHovering) setToolbarVisible(false);
        }, 5000);
      }
    };
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      clearTimeout(showTimeout);
      
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        // Scrolling up or near top - show toolbar
        setToolbarVisible(true);
        // Keep visible for longer when scrolling
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          if (!isHovering) setToolbarVisible(false);
        }, 4000);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide after delay
        if (!isHovering) {
          showTimeout = setTimeout(() => {
            setToolbarVisible(false);
          }, 1500);
        }
      }
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(hideTimeout);
      clearTimeout(showTimeout);
    };
  }, [autoHide, isMobile, lastScrollY, isHovering]);
  
  const handleThemeSelect = (theme: 'light' | 'dark' | 'sepia' | 'night') => {
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
              className="h-full bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--accent))]/70 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Bottom Navigation Bar */}
        <div className={`fixed bottom-0 left-0 right-0 z-[80] transition-all duration-300 ${
          toolbarVisible && isVisible ? 'translate-y-0' : 'translate-y-full'
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
                    className="h-full bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--accent))]/70 rounded-full transition-all duration-300"
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
                    className="p-3 rounded-xl reader-btn-hover"
                    aria-label="Library"
                  >
                    <HomeIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onNavigatePrev}
                    disabled={!canGoPrev}
                    className="p-3 rounded-xl reader-btn-hover disabled:opacity-30"
                    aria-label="Previous"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onNavigateNext}
                    disabled={!canGoNext}
                    className="p-3 rounded-xl reader-btn-hover disabled:opacity-30"
                    aria-label="Next"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={onToggleBookmark}
                    className={`p-3 rounded-xl reader-btn-hover ${
                      isBookmarked ? 'text-[rgb(var(--accent))]' : ''
                    }`}
                    aria-label="Bookmark"
                  >
                    {isBookmarked ? <BookmarkSolidIcon className="w-5 h-5" /> : <BookmarkIcon className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    className="p-3 rounded-xl reader-btn-hover"
                    aria-label="Theme"
                  >
                    {React.createElement(themeConfigs[currentTheme].icon, { className: "w-5 h-5" })}
                  </button>
                  <button
                    onClick={onToggleToc}
                    className={`p-3 rounded-xl reader-btn-hover ${
                      showToc ? 'reader-btn-active' : ''
                    }`}
                    aria-label="Contents"
                  >
                    <Bars3Icon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onToggleSettings}
                    className={`p-3 rounded-xl reader-btn-hover ${
                      showSettings ? 'reader-btn-active' : ''
                    }`}
                    aria-label="Settings"
                  >
                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Theme Picker Overlay */}
        {showThemeMenu && (
          <div className="fixed inset-0 z-[85] flex items-end justify-center p-4 animate-fade-in">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowThemeMenu(false)}
            />
            <div className="relative w-full max-w-sm reader-floating rounded-3xl p-6 animate-slide-up">
              <h3 className="text-lg font-semibold mb-4">Reading Theme</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(themeConfigs).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleThemeSelect(key as any)}
                    className={`relative p-4 rounded-2xl border-2 transition-all ${
                      currentTheme === key 
                        ? 'border-[rgb(var(--accent))] shadow-lg scale-105' 
                        : 'border-[rgb(var(--border))]/10 hover:border-[rgb(var(--border))]/20'
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
                        <CheckIcon className="w-4 h-4 text-[rgb(var(--accent))]" />
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
          className="fixed reader-glass rounded-2xl p-3 shadow-2xl animate-scale-in"
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
                onClick={() => handleThemeSelect(key as any)}
                className={`relative px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
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
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[80] transition-all duration-500 ${
          toolbarVisible && isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="reader-floating rounded-2xl shadow-2xl animate-slide-down">
          {/* Compact Progress Bar */}
          {chapterTitle && (
            <div className="px-6 pt-4 pb-3">
              <div className="flex items-center gap-4">
                <h4 className="text-sm font-semibold truncate max-w-xs opacity-90">{chapterTitle}</h4>
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <div className="h-1.5 reader-progress-track rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[rgb(var(--accent))] via-[rgb(var(--accent))]/85 to-[rgb(var(--accent))]/70 rounded-full transition-all duration-500 ease-out relative"
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
                className="p-2.5 rounded-xl reader-btn-hover group"
                aria-label="Library"
                title="Back to Library"
              >
                <HomeIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={onNavigatePrev}
                disabled={!canGoPrev}
                className="p-2.5 rounded-xl reader-btn-hover disabled:opacity-30 disabled:cursor-not-allowed group"
                aria-label="Previous"
                title="Previous Page (←)"
              >
                <ChevronLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
              </button>
              <button
                onClick={onNavigateNext}
                disabled={!canGoNext}
                className="p-2.5 rounded-xl reader-btn-hover disabled:opacity-30 disabled:cursor-not-allowed group"
                aria-label="Next"
                title="Next Page (→)"
              >
                <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
            </div>
            
            <div className="reader-divider" />
            
            {/* Display Controls */}
            <div className="flex items-center gap-1 px-2">
              {/* Font Size */}
              <div className="flex items-center gap-0.5 bg-[rgb(var(--bg))]/30 rounded-xl p-0.5">
                <button
                  onClick={() => adjustFontSize(-2)}
                  className="px-2.5 py-2 rounded-lg reader-btn-hover group"
                  aria-label="Decrease font"
                  title="Decrease Font Size"
                >
                  <span className="text-xs font-bold opacity-80 group-hover:opacity-100 transition-opacity">A−</span>
                </button>
                <button
                  onClick={() => setShowFontMenu(!showFontMenu)}
                  className="px-3 py-1.5 rounded-lg"
                  title="Font Size"
                >
                  <span className="text-[11px] font-semibold tabular-nums opacity-70">{fontSize}px</span>
                </button>
                <button
                  onClick={() => adjustFontSize(2)}
                  className="px-2.5 py-2 rounded-lg reader-btn-hover group"
                  aria-label="Increase font"
                  title="Increase Font Size"
                >
                  <span className="text-xs font-bold opacity-80 group-hover:opacity-100 transition-opacity">A+</span>
                </button>
              </div>
              
              {/* Theme Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  className="p-2.5 rounded-xl reader-btn-hover group"
                  aria-label="Theme"
                  title={`Theme: ${themeConfigs[currentTheme].label}`}
                >
                  {React.createElement(themeConfigs[currentTheme].icon, { 
                    className: "w-4 h-4 group-hover:scale-110 transition-transform duration-200" 
                  })}
                </button>
                
              </div>
              
              {/* Fullscreen */}
              <button
                onClick={onToggleFullscreen}
                className="p-2.5 rounded-xl reader-btn-hover group"
                aria-label="Fullscreen"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                ) : (
                  <ArrowsPointingOutIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
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
                  className={`p-2.5 rounded-xl transition-all duration-300 group ${
                    isPinned 
                      ? 'bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/15' 
                      : 'reader-btn-hover opacity-60 hover:opacity-100'
                  }`}
                  aria-label={isPinned ? "Unpin toolbar" : "Pin toolbar"}
                  title={isPinned ? "Unpin toolbar (auto-hide when idle)" : "Pin toolbar (always visible)"}
                >
                  {isPinned ? (
                    <LockClosedIcon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  ) : (
                    <LockOpenIcon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  )}
                </button>
              )}
              
              <div className="reader-divider" />
              <button
                onClick={onToggleSearch}
                className={`p-2.5 rounded-xl reader-btn-hover group ${
                  showSearch ? 'reader-btn-active' : ''
                }`}
                aria-label="Search"
                title="Search (Ctrl+F)"
              >
                <MagnifyingGlassIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={onToggleBookmark}
                className={`p-2.5 rounded-xl reader-btn-hover group ${
                  isBookmarked ? 'text-[rgb(var(--accent))]' : ''
                }`}
                aria-label="Bookmark"
                title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
              >
                {isBookmarked ? (
                  <BookmarkSolidIcon className="w-4 h-4 group-hover:scale-125 transition-all duration-200 animate-bookmark-add" />
                ) : (
                  <BookmarkIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                )}
              </button>
              <button
                onClick={onToggleToc}
                className={`p-2.5 rounded-xl reader-btn-hover group ${
                  showToc ? 'reader-btn-active' : ''
                }`}
                aria-label="Contents"
                title="Table of Contents"
              >
                <Bars3Icon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={onToggleAnnotations}
                className={`p-2.5 rounded-xl reader-btn-hover group ${
                  showAnnotations ? 'reader-btn-active' : ''
                }`}
                aria-label="Annotations"
                title="Annotations & Notes"
              >
                <PencilSquareIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={onToggleSettings}
                className={`p-2.5 rounded-xl reader-btn-hover group ${
                  showSettings ? 'reader-btn-active' : ''
                }`}
                aria-label="Settings"
                title="Reading Settings"
              >
                <Cog6ToothIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Minimal Progress Indicator (when toolbar is hidden) */}
      {!toolbarVisible && (
        <div className="fixed top-0 left-0 right-0 z-[75] h-0.5 reader-progress-track">
          <div 
            className="h-full bg-[rgb(var(--accent))]/40 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </>
  );
}