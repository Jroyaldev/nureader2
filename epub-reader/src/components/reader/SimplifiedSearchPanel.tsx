"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useReader } from '@/contexts/ReaderContext';

/**
 * Simplified SearchPanel using the new ReaderContext
 * 
 * This demonstrates how components become much cleaner with centralized state:
 * - No props drilling
 * - Direct access to reader state
 * - Cleaner component interface
 * - Automatic state persistence
 */
export default function SimplifiedSearchPanel() {
  // Access all reader state and actions through context
  const { state, panels, book, ui } = useReader();
  
  // Local component state (not shared)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus search input when panel opens
  useEffect(() => {
    if (state.panels.search && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [state.panels.search]);

  // Reset state when panel closes
  useEffect(() => {
    if (!state.panels.search) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedResultIndex(-1);
    }
  }, [state.panels.search]);

  // Handle search using context
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const results = await book.search(searchQuery);
      setSearchResults(results);
      setSelectedResultIndex(results.length > 0 ? 0 : -1);
      
      if (results.length === 0) {
        ui.showToast(`No results found for "${searchQuery}"`, 'info');
      }
    } catch (error) {
      ui.showToast('Search failed. Please try again.', 'error');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, book, ui]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (searchResults.length > 0 && selectedResultIndex >= 0) {
        // Navigate to result using context
        // onNavigateToResult(searchResults[selectedResultIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex(prev => 
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    } else if (e.key === 'Escape') {
      panels.close('search');
    }
  }, [searchResults, selectedResultIndex, handleSearch, panels]);

  const handleResultClick = useCallback((result: any, index: number) => {
    setSelectedResultIndex(index);
    // Navigation would use context methods
    // navigation.goTo(result.location);
  }, []);

  const navigateToNext = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIndex = selectedResultIndex < searchResults.length - 1 ? selectedResultIndex + 1 : 0;
    setSelectedResultIndex(nextIndex);
    // Use context for navigation
    // navigation.goTo(searchResults[nextIndex].location);
  }, [searchResults, selectedResultIndex]);

  const navigateToPrev = useCallback(() => {
    if (searchResults.length === 0) return;
    const prevIndex = selectedResultIndex > 0 ? selectedResultIndex - 1 : searchResults.length - 1;
    setSelectedResultIndex(prevIndex);
    // Use context for navigation
    // navigation.goTo(searchResults[prevIndex].location);
  }, [searchResults, selectedResultIndex]);

  // Scroll selected result into view
  useEffect(() => {
    if (selectedResultIndex >= 0 && resultsRef.current) {
      const resultElements = resultsRef.current.querySelectorAll('[data-result-index]');
      const selectedElement = resultElements[selectedResultIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedResultIndex]);

  // Use responsive panel pattern that adapts to mobile/desktop
  return (
    <div className={`${
      state.ui.isMobile 
        ? 'fixed inset-x-0 bottom-0 top-1/3 z-50 transition-all duration-300 transform '
        : 'fixed right-0 top-0 h-full z-40 transition-all duration-300 '
    }${
      state.panels.search 
        ? state.ui.isMobile 
          ? 'translate-y-0' 
          : 'translate-x-0'
        : state.ui.isMobile 
          ? 'translate-y-full' 
          : 'translate-x-full'
    }`}>
      <div className={`h-full ${
        state.ui.isMobile 
          ? 'w-full bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-black/10 dark:border-white/20 rounded-t-2xl'
          : 'w-96 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-l border-black/10 dark:border-white/20'
      } shadow-2xl flex flex-col font-inter`}>
        
        {/* Header */}
        <div className={`p-6 border-b border-black/5 dark:border-white/5 shrink-0 ${
          state.ui.isMobile ? 'pb-4' : ''
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 font-inter">
              <MagnifyingGlassIcon className="w-5 h-5" />
              Search Book
            </h2>
            <button
              onClick={() => panels.close('search')}
              className="p-2 hover:bg-black/10 dark:hover:bg-white/20 active:bg-black/20 dark:active:bg-white/30 rounded-lg transition-colors touch-manipulation backdrop-blur-sm"
              aria-label="Close search"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for text..."
              className="w-full px-4 py-3 pr-32 rounded-xl bg-white/80 dark:bg-black/80 backdrop-blur-md 
                       border border-black/10 dark:border-white/10 focus:border-blue-500/30 
                       focus:bg-white/90 dark:focus:bg-black/90 transition-all shadow-lg
                       placeholder:text-muted text-foreground font-inter touch-manipulation"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 
                       bg-blue-500/90 backdrop-blur-md text-white rounded-lg font-medium text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600/90 active:bg-blue-700/90 
                       transition-all touch-manipulation font-inter shadow-lg border border-blue-500/20"
            >
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Search'
              )}
            </button>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-20 top-1/2 -translate-y-1/2 p-1 
                         hover:bg-black/10 dark:hover:bg-white/20 rounded transition-colors"
                aria-label="Clear search"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results Count & Navigation */}
          {searchResults.length > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-muted">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={navigateToPrev}
                  className="p-1.5 hover:bg-black/10 dark:hover:bg-white/20 rounded transition-colors touch-manipulation backdrop-blur-sm"
                  aria-label="Previous result"
                >
                  <ChevronUpIcon className="w-4 h-4" />
                </button>
                <span className="px-2 text-muted">
                  {selectedResultIndex + 1} / {searchResults.length}
                </span>
                <button
                  onClick={navigateToNext}
                  className="p-1.5 hover:bg-black/10 dark:hover:bg-white/20 rounded transition-colors touch-manipulation backdrop-blur-sm"
                  aria-label="Next result"
                >
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        <div ref={resultsRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* No Results State */}
          {searchResults.length === 0 && searchQuery && !isSearching && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                <MagnifyingGlassIcon className="w-8 h-8 text-muted" />
              </div>
              <p className="text-foreground font-medium">No results found</p>
              <p className="text-sm text-muted mt-1">Try different search terms</p>
            </div>
          )}
          
          {/* Search Results */}
          {searchResults.map((result, index) => (
            <button
              key={result.id}
              data-result-index={index}
              onClick={() => handleResultClick(result, index)}
              className={`w-full text-left p-4 rounded-xl transition-all touch-manipulation font-inter ${
                selectedResultIndex === index
                  ? 'bg-blue-500/20 backdrop-blur-md border border-blue-500/30 shadow-lg'
                  : 'bg-white/80 dark:bg-black/80 backdrop-blur-md hover:bg-white/90 dark:hover:bg-black/90 border border-black/10 dark:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium text-muted">
                  {result.chapter}
                </span>
                {result.chapter === state.book.chapterTitle && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
                    Current
                  </span>
                )}
              </div>
              <div className="text-sm">
                <span className="text-muted">...</span>
                <span className="mx-1 text-foreground">
                  {result.context.substring(0, result.context.indexOf(result.text))}
                </span>
                <mark className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground font-medium px-0.5 rounded">
                  {result.text}
                </mark>
                <span className="mx-1 text-foreground">
                  {result.context.substring(result.context.indexOf(result.text) + result.text.length)}
                </span>
                <span className="text-muted">...</span>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Actions Hint */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 shrink-0">
          <div className={`flex items-center text-xs text-muted ${
            state.ui.isMobile ? 'justify-center' : 'justify-between'
          }`}>
            <span>Tap result to navigate</span>
            {!state.ui.isMobile && <span>↑↓ to navigate • Esc to close</span>}
          </div>
        </div>
      </div>
    </div>
  );
}