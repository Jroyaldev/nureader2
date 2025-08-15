"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface SearchResult {
  id: string;
  text: string;
  context: string;
  chapter: string;
  chapterIndex: number;
  position: number;
}

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => Promise<SearchResult[]>;
  onNavigateToResult: (result: SearchResult) => void;
  currentChapter?: string;
}

export default function SearchPanel({
  isOpen,
  onClose,
  onSearch,
  onNavigateToResult,
  currentChapter
}: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
    }
  }, [isOpen]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      const results = await onSearch(searchQuery);
      setSearchResults(results);
      setSelectedResultIndex(results.length > 0 ? 0 : -1);
      
      if (results.length === 0) {
        setError(`No results found for "${searchQuery}"`);
      }
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (searchResults.length > 0 && selectedResultIndex >= 0) {
        onNavigateToResult(searchResults[selectedResultIndex]);
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
      onClose();
    }
  }, [searchResults, selectedResultIndex, onNavigateToResult, handleSearch, onClose]);

  const handleResultClick = useCallback((result: SearchResult, index: number) => {
    setSelectedResultIndex(index);
    onNavigateToResult(result);
  }, [onNavigateToResult]);

  const navigateToNext = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIndex = selectedResultIndex < searchResults.length - 1 ? selectedResultIndex + 1 : 0;
    setSelectedResultIndex(nextIndex);
    onNavigateToResult(searchResults[nextIndex]);
  }, [searchResults, selectedResultIndex, onNavigateToResult]);

  const navigateToPrev = useCallback(() => {
    if (searchResults.length === 0) return;
    const prevIndex = selectedResultIndex > 0 ? selectedResultIndex - 1 : searchResults.length - 1;
    setSelectedResultIndex(prevIndex);
    onNavigateToResult(searchResults[prevIndex]);
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
    <div className={`fixed right-0 top-0 h-full z-40 transition-all duration-300 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="h-full w-96 glass-strong shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MagnifyingGlassIcon className="w-5 h-5" />
              Search Book
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
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
              className="w-full px-4 py-3 pr-24 rounded-xl bg-black/5 dark:bg-white/5 
                       border border-transparent focus:border-[rgb(var(--accent))]/30 
                       focus:bg-black/10 dark:focus:bg-white/10 transition-all
                       placeholder:text-muted text-foreground"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 
                       bg-[rgb(var(--accent))] text-white rounded-lg font-medium text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
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
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-muted">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={navigateToPrev}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                  aria-label="Previous result"
                >
                  <ChevronUpIcon className="w-4 h-4" />
                </button>
                <span className="px-2 text-muted">
                  {selectedResultIndex + 1} / {searchResults.length}
                </span>
                <button
                  onClick={navigateToNext}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
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
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {searchResults.map((result, index) => (
            <button
              key={result.id}
              data-result-index={index}
              onClick={() => handleResultClick(result, index)}
              className={`w-full text-left p-4 rounded-xl transition-all ${
                selectedResultIndex === index
                  ? 'bg-[rgb(var(--accent))]/10 border border-[rgb(var(--accent))]/30'
                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium text-muted">
                  {result.chapter}
                </span>
                {result.chapter === currentChapter && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]">
                    Current
                  </span>
                )}
              </div>
              <div className="text-sm">
                <span className="text-muted">...</span>
                <span className="mx-1">
                  {result.context.substring(0, result.context.indexOf(result.text))}
                </span>
                <mark className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground font-medium px-0.5 rounded">
                  {result.text}
                </mark>
                <span className="mx-1">
                  {result.context.substring(result.context.indexOf(result.text) + result.text.length)}
                </span>
                <span className="text-muted">...</span>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Press Enter to search</span>
            <span>↑↓ to navigate • Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}