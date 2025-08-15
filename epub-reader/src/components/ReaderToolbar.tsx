"use client";

import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  MoonIcon,
  SunIcon,
  Bars3Icon,
  BookOpenIcon,
  PencilSquareIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  HomeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import React from 'react';

interface ReaderToolbarProps {
  onNavigateHome: () => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onToggleTheme: () => void;
  onToggleToc: () => void;
  onToggleAnnotations: () => void;
  onToggleSettings?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  currentTheme: 'light' | 'dark';
  canGoNext: boolean;
  canGoPrev: boolean;
  showToc: boolean;
  showAnnotations: boolean;
  progress: number;
  chapterTitle?: string;
  isVisible?: boolean;
  isMobile?: boolean;
}

export default function ReaderToolbar({
  onNavigateHome,
  onNavigatePrev,
  onNavigateNext,
  onToggleTheme,
  onToggleToc,
  onToggleAnnotations,
  onToggleSettings,
  onZoomIn,
  onZoomOut,
  currentTheme,
  canGoNext,
  canGoPrev,
  showToc,
  showAnnotations,
  progress,
  chapterTitle,
  isVisible = true,
  isMobile = false
}: ReaderToolbarProps) {
  
  if (isMobile) {
    // Mobile Bottom Bar
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="bg-gradient-to-t from-[rgb(var(--bg))] via-[rgb(var(--bg))]/95 to-transparent p-4">
          <div className="glass rounded-2xl px-4 py-3 shadow-2xl">
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span className="truncate max-w-[60%]">{chapterTitle || 'Loading...'}</span>
                <span className="font-medium tabular-nums">{progress}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[rgb(var(--accent))] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-between">
              {/* Navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onNavigateHome}
                  className="p-2.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Home"
                >
                  <HomeIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={onNavigatePrev}
                  disabled={!canGoPrev}
                  className="p-2.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
                  aria-label="Previous"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={onNavigateNext}
                  disabled={!canGoNext}
                  className="p-2.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
                  aria-label="Next"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
              
              {/* Tools */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleTheme}
                  className="p-2.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Toggle theme"
                >
                  {currentTheme === 'dark' ? (
                    <SunIcon className="w-5 h-5" />
                  ) : (
                    <MoonIcon className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={onToggleToc}
                  className={`p-2.5 rounded-lg hover:bg-white/10 transition-colors ${
                    showToc ? 'bg-white/10' : ''
                  }`}
                  aria-label="Table of contents"
                >
                  <Bars3Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={onToggleAnnotations}
                  className={`p-2.5 rounded-lg hover:bg-white/10 transition-colors ${
                    showAnnotations ? 'bg-white/10' : ''
                  }`}
                  aria-label="Annotations"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Desktop Floating Toolbar
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
    }`}>
      <div className="glass rounded-2xl px-6 py-4 shadow-2xl">
        {/* Chapter & Progress */}
        {chapterTitle && (
          <div className="mb-4 text-center">
            <h4 className="text-sm font-medium text-foreground mb-2 truncate max-w-xs">
              {chapterTitle}
            </h4>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[rgb(var(--accent))] rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-medium tabular-nums text-muted min-w-[3rem]">
                {progress}%
              </span>
            </div>
          </div>
        )}
        
        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {/* Navigation Group */}
          <div className="flex items-center gap-1 pr-2 border-r border-white/10">
            <button
              onClick={onNavigateHome}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
              aria-label="Library"
              title="Back to Library"
            >
              <BookOpenIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={onNavigatePrev}
              disabled={!canGoPrev}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 group"
              aria-label="Previous"
              title="Previous Page (←)"
            >
              <ChevronLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={onNavigateNext}
              disabled={!canGoNext}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 group"
              aria-label="Next"
              title="Next Page (→)"
            >
              <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          
          {/* View Controls */}
          {onZoomOut && onZoomIn && (
            <div className="flex items-center gap-1 px-2 border-x border-white/10">
              <button
                onClick={onZoomOut}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
                aria-label="Zoom out"
                title="Zoom Out"
              >
                <MagnifyingGlassMinusIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={onZoomIn}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
                aria-label="Zoom in"
                title="Zoom In"
              >
                <MagnifyingGlassPlusIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
          
          {/* Tools Group */}
          <div className="flex items-center gap-1 pl-2">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
              aria-label="Toggle theme"
              title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {currentTheme === 'dark' ? (
                <SunIcon className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              ) : (
                <MoonIcon className="w-4 h-4 group-hover:-rotate-12 transition-transform" />
              )}
            </button>
            <button
              onClick={onToggleToc}
              className={`p-2 rounded-lg hover:bg-white/10 transition-colors group ${
                showToc ? 'bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]' : ''
              }`}
              aria-label="Table of contents"
              title="Table of Contents"
            >
              <Bars3Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={onToggleAnnotations}
              className={`p-2 rounded-lg hover:bg-white/10 transition-colors group ${
                showAnnotations ? 'bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]' : ''
              }`}
              aria-label="Annotations"
              title="Annotations"
            >
              <PencilSquareIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
            {onToggleSettings && (
              <button
                onClick={onToggleSettings}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
                aria-label="Settings"
                title="Reading Settings"
              >
                <Cog6ToothIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}