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
  isMobile?: boolean;
}

export default function SearchPanel({
  isOpen,
  onClose,
  onSearch,
  onNavigateToResult,
  currentChapter,
  isMobile = false
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

  // Mobile bottom sheet design
  if (isMobile) {
    return (
      <div className={`
        fixed inset-0 z-[80] transition-all duration-500 ease-out
        ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}
      `}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md"
          onClick={onClose}
        />
        
        {/* Bottom Sheet */}
        <div className={`
          absolute bottom-0 left-0 right-0 
          glass-primary backdrop-blur-xl
          border-t border-black/10 dark:border-white/20
          shadow-2xl transform transition-all duration-500 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          safe-area-pb
        `} style={{
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          maxHeight: '85vh'
        }}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                <MagnifyingGlassIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Search</h2>
                <p className="text-sm text-muted">Find text in your book</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 active:bg-black/5 dark:active:bg-white/10 rounded-xl transition-colors touch-manipulation"
              aria-label="Close search"
            >
              <XMarkIcon className="w-5 h-5 text-muted" />
            </button>
          </div>
          
          {/* Search Input */}
          <div className="p-6 bg-gradient-to-r from-gray-50/50 to-blue-50/30 dark:from-gray-800/50 dark:to-blue-900/20 border-b border-black/5 dark:border-white/10">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search for text..."
                className="w-full px-4 py-4 pr-32 rounded-2xl bg-white/80 backdrop-blur-md 
                         border border-black/10 dark:border-white/10 focus:border-blue-500/50 
                         focus:bg-white/90 dark:bg-black/80 dark:focus:bg-black/90 transition-all
                         placeholder:text-muted text-foreground text-lg shadow-lg font-inter touch-manipulation"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 
                         bg-blue-500/90 backdrop-blur-md active:bg-blue-600/90 disabled:bg-gray-300/80 dark:disabled:bg-gray-600/80 touch-manipulation
                         text-white rounded-xl font-medium text-sm transition-colors font-inter
                         disabled:cursor-not-allowed flex items-center gap-2 shadow-lg border border-blue-600/20"
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <MagnifyingGlassIcon className="w-4 h-4" />
                )}
                {isSearching ? 'Searching...' : 'Search'}
              </button>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-20 top-1/2 -translate-y-1/2 p-2 
                           active:bg-black/10 dark:active:bg-white/20 rounded-lg transition-colors touch-manipulation backdrop-blur-sm min-w-[32px] min-h-[32px] flex items-center justify-center"
                >
                  <XMarkIcon className="w-4 h-4 text-muted" />
                </button>
              )}
            </div>
          </div>
          
          {/* Results */}
          <div className="flex-1 overflow-hidden">
            {searchResults.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-green-50/80 to-blue-50/60 dark:from-green-900/40 dark:to-blue-900/40 border-b border-black/10 dark:border-white/20 backdrop-blur-md font-inter">
                <span className="text-sm font-medium text-foreground">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={navigateToPrev}
                    className="p-2.5 active:bg-black/10 dark:active:bg-white/20 rounded-xl transition-colors touch-manipulation backdrop-blur-sm min-w-[40px] min-h-[40px] flex items-center justify-center"
                    aria-label="Previous result"
                  >
                    <ChevronUpIcon className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-sm text-muted">
                    {selectedResultIndex + 1} of {searchResults.length}
                  </span>
                  <button
                    onClick={navigateToNext}
                    className="p-2.5 active:bg-black/10 dark:active:bg-white/20 rounded-xl transition-colors touch-manipulation backdrop-blur-sm min-w-[40px] min-h-[40px] flex items-center justify-center"
                    aria-label="Next result"
                  >
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            <div 
              ref={resultsRef}
              className="overflow-y-auto max-h-96 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
            >
              {searchResults.length === 0 && searchQuery && !isSearching && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                    <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-muted font-medium">No results found</p>
                  <p className="text-sm text-muted mt-1">Try different search terms</p>
                </div>
              )}
              
              {searchResults.map((result, index) => (
                <button
                  key={result.id}
                  data-result-index={index}
                  onClick={() => onNavigateToResult(result)}
                  className={`w-full p-4 text-left border-b border-black/10 dark:border-white/10 
                           transition-all active:bg-black/10 dark:active:bg-white/10 touch-manipulation font-inter ${
                    index === selectedResultIndex
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : ''
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
                  <p className="text-sm text-foreground leading-relaxed">
                    {result.context}
                  </p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Quick Actions Hint */}
          <div className="px-6 py-3 bg-gradient-to-r from-gray-50/80 to-blue-50/60 dark:from-gray-800/80 dark:to-blue-900/40 border-t border-black/10 dark:border-white/20 backdrop-blur-md font-inter">
            <p className="text-xs text-muted text-center">
              Tap a result to navigate • Use ↑↓ arrows for quick navigation
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Desktop design
  return (
    <div className={`fixed right-0 top-0 h-full z-40 transition-all duration-300 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="h-full w-96 glass-primary backdrop-blur-xl border-l border-white/20 shadow-2xl flex flex-col font-inter">
        {/* Header */}
        <div className="p-6 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 font-inter">
              <MagnifyingGlassIcon className="w-5 h-5" />
              Search Book
            </h2>
            <button
              onClick={onClose}
              className="p-2 active:bg-black/10 dark:active:bg-white/20 rounded-lg transition-colors touch-manipulation backdrop-blur-sm"
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
              className="w-full px-4 py-3 pr-24 rounded-xl bg-white/80 dark:bg-black/80 backdrop-blur-md 
                       border border-black/10 dark:border-white/10 focus:border-blue-500/30 
                       focus:bg-white/90 dark:focus:bg-black/90 transition-all shadow-lg
                       placeholder:text-muted text-foreground font-inter touch-manipulation"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 
                       bg-blue-500/90 backdrop-blur-md text-white rounded-lg font-medium text-sm
          disabled:opacity-50 disabled:cursor-not-allowed active:opacity-90 transition-opacity touch-manipulation font-inter shadow-lg border border-blue-500/20"
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
                  className="p-1 active:bg-black/10 dark:active:bg-white/20 rounded transition-colors touch-manipulation backdrop-blur-sm"
                  aria-label="Previous result"
                >
                  <ChevronUpIcon className="w-4 h-4" />
                </button>
                <span className="px-2 text-muted">
                  {selectedResultIndex + 1} / {searchResults.length}
                </span>
                <button
                  onClick={navigateToNext}
                  className="p-1 active:bg-black/10 dark:active:bg-white/20 rounded transition-colors touch-manipulation backdrop-blur-sm"
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
            <div className="p-4 rounded-xl bg-red-500/20 backdrop-blur-md text-red-600 dark:text-red-400 text-sm font-inter border border-red-500/20">
              {error}
            </div>
          )}
          
          {searchResults.map((result, index) => (
            <button
              key={result.id}
              data-result-index={index}
              onClick={() => handleResultClick(result, index)}
              className={`w-full text-left p-4 rounded-xl transition-all touch-manipulation font-inter ${
                selectedResultIndex === index
                  ? 'bg-blue-500/20 backdrop-blur-md border border-blue-500/30 shadow-lg'
                  : 'bg-white/80 dark:bg-black/80 backdrop-blur-md active:bg-white/90 dark:active:bg-black/90 border border-black/10 dark:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium text-muted">
                  {result.chapter}
                </span>
                {result.chapter === currentChapter && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
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