"use client";

import {
  ChevronRightIcon,
  ChevronDownIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  CheckIcon,
  DocumentTextIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { BookOpenIcon as BookOpenSolidIcon } from '@heroicons/react/24/solid';
import React, { useState, useEffect, useRef, useMemo } from 'react';

interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
  level?: number;
  pageNumber?: number;
}

interface TableOfContentsProps {
  items: TocItem[];
  currentChapter?: string;
  onNavigate: (href: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
  progress?: number;
  bookTitle?: string;
  totalPages?: number;
}

// Recursive component for nested TOC items
const TocItemComponent: React.FC<{
  item: TocItem;
  level: number;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: (href: string) => void;
  searchQuery: string;
  isMobile?: boolean;
  currentChapter?: string;
  expandAll?: boolean;
}> = ({ item, level, isActive, isExpanded, onToggle, onNavigate, searchQuery, isMobile, currentChapter, expandAll }) => {
  const hasChildren = item.subitems && item.subitems.length > 0;
  
  // Highlight search matches
  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-blue-500/20 text-blue-500 rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="select-none" style={{ scrollMarginTop: '12px' }}>
      <button
        onClick={() => {
          if (hasChildren && isMobile) {
            onToggle();
          } else {
            onNavigate(item.href);
          }
        }}
        className={`
          w-full text-left transition-all duration-200 rounded-lg group
          ${level === 0 ? 'py-3 px-4' : level === 1 ? 'py-2.5 px-4 pl-8' : 'py-2 px-4 pl-12'}
          ${isActive 
            ? 'bg-blue-500/10 text-blue-500'
        : 'hover:bg-[rgba(var(--muted),0.08)] text-foreground hover:text-blue-500'
          }
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="shrink-0 p-0.5 -ml-1 rounded hover:bg-[rgba(var(--muted),0.1)]"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </button>
            )}
            
            {!hasChildren && level === 0 && (
              <DocumentTextIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-500' : 'text-muted'}`} />
            )}
            
            <span className={`
              truncate pr-2
              ${level === 0 ? 'font-medium text-sm' : level === 1 ? 'text-sm' : 'text-xs'}
              ${isActive ? 'font-semibold' : ''}
            `}>
              {highlightText(item.label)}
            </span>
          </div>
          
          {isActive && (
            <div className="shrink-0 flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-blue-500" />
            </div>
          )}
          
          {item.pageNumber && !isMobile && (
            <span className="shrink-0 text-xs text-muted tabular-nums">
              p. {item.pageNumber}
            </span>
          )}
        </div>
      </button>
      
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.subitems?.map((subitem, idx) => {
            const childChapter = isActive ? item.label : currentChapter;
            return (
              <TocItemWithState
                key={`${subitem.href}-${idx}`}
                item={subitem}
                level={level + 1}
                currentChapter={childChapter}
                onNavigate={onNavigate}
                searchQuery={searchQuery}
                isMobile={isMobile}
                expandAll={expandAll ?? false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// Wrapper component to manage expanded state
const TocItemWithState: React.FC<{
  item: TocItem;
  level: number;
  currentChapter: string | undefined;
  onNavigate: (href: string) => void;
  searchQuery: string;
  isMobile: boolean | undefined;
  expandAll?: boolean;
}> = ({ item, level, currentChapter, onNavigate, searchQuery, isMobile, expandAll }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = currentChapter === item.label;
  
  // Auto-expand if active or has active children
  useEffect(() => {
    if (isActive || item.subitems?.some(sub => sub.label === currentChapter)) {
      setIsExpanded(true);
    }
  }, [currentChapter, isActive, item.subitems]);

  // Respond to global expand/collapse command
  useEffect(() => {
    if (typeof expandAll === 'boolean') {
      setIsExpanded(expandAll);
    }
  }, [expandAll]);

  return (
    <TocItemComponent
      item={item}
      level={level}
      isActive={isActive}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      onNavigate={onNavigate}
      searchQuery={searchQuery}
      isMobile={isMobile ?? false}
      currentChapter={currentChapter ?? ''}
      expandAll={expandAll ?? false}
    />
  );
};

export default function TableOfContents({
  items,
  currentChapter,
  onNavigate,
  isOpen,
  onClose,
  isMobile = false,
  progress = 0,
  bookTitle,
  totalPages,
}: TableOfContentsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandAll, setExpandAll] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;

    const query = searchQuery.toLowerCase();
    const mapFilter = (nodes: TocItem[]): TocItem[] => {
      const out: TocItem[] = [];
      for (const n of nodes) {
        const child = n.subitems ? mapFilter(n.subitems) : [];
        const match = n.label.toLowerCase().includes(query);
        if (match || child.length) {
          out.push({ ...n, subitems: child.length ? child : (n.subitems || []) });
        }
      }
      return out;
    };

    return mapFilter(items);
  }, [items, searchQuery]);

  // Focus search on open
  useEffect(() => {
    if (isOpen && !isMobile) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, isMobile]);

  // Scroll to active item (align near top, not under header)
  useEffect(() => {
    if (isOpen && activeItemRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const active = activeItemRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      // delta relative to container viewport
      const deltaTop = activeRect.top - containerRect.top;
      const deltaBottom = activeRect.bottom - containerRect.bottom;

      if (deltaTop < 0 || deltaBottom > 0) {
        const target = container.scrollTop + deltaTop - 8; // small top offset
        container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      }
    }
  }, [isOpen, currentChapter]);

  const handleNavigate = (href: string) => {
    onNavigate(href);
    if (isMobile) {
      onClose();
    }
  };

  // Calculate reading stats
  const chaptersRead = items.findIndex(item => item.label === currentChapter) + 1;
  const totalChapters = items.length;

  if (isMobile) {
    // Mobile: Enhanced bottom sheet with glassmorphism
    return (
      <div className={`
        fixed inset-0 z-[90] transition-all duration-500
        ${isOpen ? 'visible' : 'invisible'}
      `}>
        {/* Enhanced Backdrop */}
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-500 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        
        {/* Enhanced Bottom Sheet with Glassmorphism */}
        <div className={`
          absolute bottom-0 left-0 right-0 
          bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
          border border-white/20 dark:border-gray-700/30
          shadow-2xl shadow-black/20
          rounded-t-3xl transition-all duration-500 ease-out 
          max-h-[85vh] flex flex-col
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          safe-area-pb
        `}>
          {/* Enhanced Handle */}
          <div className="flex justify-center pt-4 pb-3">
            <div className="w-12 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded-full" />
          </div>
          
          {/* Enhanced Header */}
          <div className="px-6 pb-4 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center backdrop-blur-sm">
            <BookOpenSolidIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contents</h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Navigate chapters</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 -mr-2 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all duration-200 backdrop-blur-sm"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Enhanced Stats */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-700/30 rounded-xl backdrop-blur-sm border border-gray-200/20 dark:border-gray-700/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{chaptersRead} of {totalChapters} chapters</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded-full font-medium">
                  {progress}% complete
                </div>
              </div>
            </div>
            
            {/* Enhanced Search */}
            <div className="relative mt-4">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30 rounded-xl text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all duration-200 font-inter"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-all duration-200"
                >
                  <XMarkIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>
          </div>
          
          {/* Enhanced Content */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-gray-300/50 dark:scrollbar-thumb-gray-600/50 scrollbar-track-transparent"
          >
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100/50 dark:bg-gray-800/30 flex items-center justify-center backdrop-blur-sm">
                  <MagnifyingGlassIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">No chapters found</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-blue-500 hover:text-blue-400 font-medium font-inter transition-colors duration-200"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-1 pb-8">
                {filteredItems.map((item, idx) => (
                  <div key={`${item.href}-${idx}`} ref={currentChapter === item.label ? activeItemRef : undefined}>
                    <TocItemWithState
                      item={item}
                      level={0}
                      currentChapter={currentChapter}
                      onNavigate={handleNavigate}
                      searchQuery={searchQuery}
                      isMobile={isMobile}
                      expandAll={expandAll ?? false}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Floating sidebar
    return (
      <div className={`
      fixed left-6 top-1/2 -translate-y-1/2 z-[75] w-[380px] h-[min(700px,90vh)]
      transition-all duration-500 ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 pointer-events-none'}
    `}>
      <div className="reader-floating no-top-glint rounded-2xl flex flex-col h-full">
        {/* Header (static; content below scrolls) */}
        <div className="px-6 py-5 shrink-0 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
                <BookOpenIcon className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold font-inter text-gray-900 dark:text-white">Table of Contents</h3>
                {bookTitle && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-inter truncate max-w-[200px]">{bookTitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg hover:bg-[rgba(var(--muted),0.1)] transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 font-inter mb-1">
              <span>Chapter {chaptersRead} of {totalChapters}</span>
              <span className="font-medium tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 bg-[rgba(var(--muted),0.1)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/20 rounded-lg text-sm placeholder-gray-500 dark:placeholder-gray-400 font-inter text-gray-900 dark:text-white backdrop-blur-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 focus:bg-white/70 dark:focus:bg-gray-800/70
                       transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[rgba(var(--muted),0.1)]"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[rgba(var(--muted),0.05)] 
                       hover:bg-[rgba(var(--muted),0.1)] transition-colors"
            >
              {expandAll ? 'Collapse All' : 'Expand All'}
            </button>
            <button
              onClick={() => {
                const currentIdx = items.findIndex(item => item.label === currentChapter);
                const prevItem = items[currentIdx - 1];
                if (currentIdx > 0 && prevItem) {
                  handleNavigate(prevItem.href);
                }
              }}
              disabled={chaptersRead <= 1}
              className="p-1.5 rounded-lg bg-[rgba(var(--muted),0.05)] hover:bg-[rgba(var(--muted),0.1)] 
                       transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous Chapter"
            >
              <ArrowUpIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const currentIdx = items.findIndex(item => item.label === currentChapter);
                const nextItem = items[currentIdx + 1];
                if (currentIdx < items.length - 1 && nextItem) {
                  handleNavigate(nextItem.href);
                }
              }}
              disabled={chaptersRead >= totalChapters}
              className="p-1.5 rounded-lg bg-[rgba(var(--muted),0.05)] hover:bg-[rgba(var(--muted),0.1)] 
                       transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next Chapter"
            >
              <ArrowDownIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4"
        >
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <MagnifyingGlassIcon className="w-8 h-8 text-muted mx-auto mb-3" />
              <p className="text-sm text-muted">No chapters found</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-blue-500 hover:text-blue-400 font-inter transition-colors duration-200"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredItems.map((item, idx) => (
                <div key={`${item.href}-${idx}`} ref={currentChapter === item.label ? activeItemRef : undefined}>
                  <TocItemWithState
                    item={item}
                    level={0}
                    currentChapter={currentChapter}
                    onNavigate={handleNavigate}
                    searchQuery={searchQuery}
                    isMobile={isMobile}
                    expandAll={expandAll ?? false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer with stats */}
        {totalPages && (
          <div className="px-6 py-3 border-t border-black/5 dark:border-white/5 bg-[rgba(var(--muted),0.02)]">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{filteredItems.length} {filteredItems.length === 1 ? 'chapter' : 'chapters'}</span>
              {totalPages && <span>{totalPages} pages total</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
