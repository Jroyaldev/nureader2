"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { UnifiedPanel, PanelHeader, PanelContent, PanelTitle } from '@/components/ui/unified/UnifiedPanel';

interface SearchResult {
  id: string;
  text: string;
  context: string;
  chapter: string;
  chapterIndex: number;
  position: number;
}

interface UnifiedSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToResult?: (result: SearchResult) => void;
  currentChapter?: string;
}

/**
 * UnifiedSearchPanel - Search panel using the new UnifiedPanel system
 * 
 * BEFORE: Inconsistent background treatments, mixed CSS classes, different mobile behavior
 * AFTER: Unified design system, consistent behavior, perfect light/dark mode support
 */
const UnifiedSearchPanel: React.FC<UnifiedSearchPanelProps> = ({
  isOpen,
  onClose,
  onNavigateToResult,
  currentChapter
}) => {
  // Local component state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus search input when panel opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedResultIndex(-1);
    }
  }, [isOpen]);

  // Mock search function (replace with actual implementation)
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock search results
      const mockResults: SearchResult[] = Array.from({ length: 5 }, (_, i) => ({
        id: `result-${i}`,
        text: searchQuery,
        context: `This is a sample context containing "${searchQuery}" for demonstration purposes. The context provides surrounding text to help understand the search result.`,
        chapter: `Chapter ${i + 1}`,
        chapterIndex: i,
        position: (i + 1) * 0.2
      }));
      
      setSearchResults(mockResults);
      setSelectedResultIndex(mockResults.length > 0 ? 0 : -1);
      
      if (mockResults.length === 0) {
        // Toast notification would go here
        console.log(`No results found for "${searchQuery}"`);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Error toast would go here
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (searchResults.length > 0 && selectedResultIndex >= 0) {
        onNavigateToResult?.(searchResults[selectedResultIndex]);
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
    }
  }, [searchResults, selectedResultIndex, handleSearch, onNavigateToResult]);

  const handleResultClick = useCallback((result: SearchResult, index: number) => {
    setSelectedResultIndex(index);
    onNavigateToResult?.(result);
  }, [onNavigateToResult]);

  const navigateToNext = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIndex = selectedResultIndex < searchResults.length - 1 ? selectedResultIndex + 1 : 0;
    setSelectedResultIndex(nextIndex);
    onNavigateToResult?.(searchResults[nextIndex]);
  }, [searchResults, selectedResultIndex, onNavigateToResult]);

  const navigateToPrev = useCallback(() => {
    if (searchResults.length === 0) return;
    const prevIndex = selectedResultIndex > 0 ? selectedResultIndex - 1 : searchResults.length - 1;
    setSelectedResultIndex(prevIndex);
    onNavigateToResult?.(searchResults[prevIndex]);
  }, [searchResults, selectedResultIndex, onNavigateToResult]);

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

  return (
    <UnifiedPanel
      variant="sidebar"
      position="right"
      size="md"
      isOpen={isOpen}
      onClose={onClose}
      closeOnEscape
      ariaLabel="Search book content"
    >
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5" />
          Search Book
        </PanelTitle>
      </PanelHeader>

      <PanelContent>
        {/* Search Input */}
        <div className="space-y-4">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for text..."
              className="w-full px-4 py-3 pr-32 rounded-xl bg-white/60 dark:bg-black/60 backdrop-blur-md 
                       border border-black/10 dark:border-white/10 focus:border-blue-500/30 
                       focus:bg-white/80 dark:focus:bg-black/80 transition-all shadow-sm
                       placeholder:text-muted text-foreground font-inter touch-manipulation
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 
                       bg-blue-500/90 backdrop-blur-md text-white rounded-lg font-medium text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600/90 active:bg-blue-700/90 
                       transition-all touch-manipulation font-inter shadow-sm border border-blue-500/20
                       focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>

          {/* Results Count & Navigation */}
          {searchResults.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={navigateToPrev}
                  className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors touch-manipulation"
                  aria-label="Previous result"
                >
                  <ChevronUpIcon className="w-4 h-4" />
                </button>
                <span className="px-2 text-muted">
                  {selectedResultIndex + 1} / {searchResults.length}
                </span>
                <button
                  onClick={navigateToNext}
                  className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors touch-manipulation"
                  aria-label="Next result"
                >
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        <div ref={resultsRef} className="mt-6 space-y-2">
          {/* No Results State */}
          {searchResults.length === 0 && searchQuery && !isSearching && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted/10 rounded-2xl flex items-center justify-center">
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
                  ? 'bg-blue-500/10 backdrop-blur-md border border-blue-500/20 shadow-sm'
                  : 'bg-white/40 dark:bg-black/40 backdrop-blur-md hover:bg-white/60 dark:hover:bg-black/60 border border-black/5 dark:border-white/5'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium text-muted">
                  {result.chapter}
                </span>
                {result.chapter === currentChapter && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
                    Current
                  </span>
                )}
              </div>
              <div className="text-sm">
                <span className="text-muted">...</span>
                <span className="mx-1 text-foreground">
                  {result.context.substring(0, result.context.indexOf(result.text))}
                </span>
                <mark className="bg-yellow-200/80 dark:bg-yellow-500/20 text-foreground font-medium px-0.5 rounded">
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
        {searchResults.length > 0 && (
          <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center justify-center text-xs text-muted">
              <span>↑↓ to navigate • Enter to go • Esc to close</span>
            </div>
          </div>
        )}
      </PanelContent>
    </UnifiedPanel>
  );
};

export default UnifiedSearchPanel;