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

interface MobileTableOfContentsProps {
  items: TocItem[];
  currentChapter?: string;
  onNavigate: (href: string) => void;
  isOpen: boolean;
  onClose: () => void;
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
  currentChapter?: string;
  expandAll?: boolean;
}> = ({ item, level, isActive, isExpanded, onToggle, onNavigate, searchQuery, currentChapter, expandAll }) => {
  const hasChildren = item.subitems && item.subitems.length > 0;
  
  // Highlight search matches
  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="select-none">
      <button
        onClick={() => {
          if (hasChildren) {
            onToggle();
          } else {
            onNavigate(item.href);
          }
        }}
        className={`
          w-full text-left transition-all duration-200 rounded-xl group touch-manipulation
          ${level === 0 ? 'py-4 px-4' : level === 1 ? 'py-3 px-4 pl-8' : 'py-2.5 px-4 pl-12'}
          ${isActive 
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 shadow-sm' 
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
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
                className="shrink-0 p-1 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </button>
            )}
            
            {!hasChildren && level === 0 && (
              <DocumentTextIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
            )}
            
            <span className={`
              truncate pr-2 font-['Inter',sans-serif]
              ${level === 0 ? 'font-semibold text-base' : level === 1 ? 'font-medium text-sm' : 'text-sm'}
              ${isActive ? 'font-bold' : ''}
            `}>
              {highlightText(item.label)}
            </span>
          </div>
          
          {isActive && (
            <div className="shrink-0 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
          )}
        </div>
      </button>
      
      {hasChildren && isExpanded && (
        <div className="mt-1 ml-2 border-l-2 border-gray-100 dark:border-gray-700/50 pl-2">
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
  expandAll?: boolean;
}> = ({ item, level, currentChapter, onNavigate, searchQuery, expandAll }) => {
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
      currentChapter={currentChapter}
      expandAll={expandAll}
    />
  );
};

export default function MobileTableOfContents({
  items,
  currentChapter,
  onNavigate,
  isOpen,
  onClose,
  progress = 0,
  bookTitle,
  totalPages
}: MobileTableOfContentsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    
    const filterItems = (items: TocItem[]): TocItem[] => {
      return items.reduce((acc: TocItem[], item) => {
        const matchesSearch = item.label.toLowerCase().includes(searchQuery.toLowerCase());
        const filteredSubitems = item.subitems ? filterItems(item.subitems) : [];
        
        if (matchesSearch || filteredSubitems.length > 0) {
          acc.push({
            ...item,
            subitems: filteredSubitems.length > 0 ? filteredSubitems : item.subitems
          });
        }
        
        return acc;
      }, []);
    };
    
    return filterItems(items);
  }, [items, searchQuery]);

  const handleNavigate = (href: string) => {
    onNavigate(href);
    onClose();
  };

  const handleExpandAll = () => {
    setExpandAll(true);
    setTimeout(() => setExpandAll(undefined), 100);
  };

  const handleCollapseAll = () => {
    setExpandAll(false);
    setTimeout(() => setExpandAll(undefined), 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm">
      <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpenSolidIcon className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-['Inter',sans-serif]">Table of Contents</h2>
                {bookTitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px] font-['Inter',sans-serif]">
                    {bookTitle}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm placeholder-gray-500 dark:placeholder-gray-400 font-['Inter',sans-serif] text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 focus:bg-white dark:focus:bg-gray-700
                       transition-all duration-200"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExpandAll}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors touch-manipulation min-h-[36px]"
            >
              <ArrowDownIcon className="w-4 h-4" />
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors touch-manipulation min-h-[36px]"
            >
              <ArrowUpIcon className="w-4 h-4" />
              Collapse All
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-2">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <MagnifyingGlassIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">No chapters found</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 text-center max-w-[200px]">
                Try adjusting your search terms
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filteredItems.map((item, idx) => (
                <TocItemWithState
                  key={`${item.href}-${idx}`}
                  item={item}
                  level={0}
                  currentChapter={currentChapter}
                  onNavigate={handleNavigate}
                  searchQuery={searchQuery}
                  expandAll={expandAll}
                />
              ))}
            </div>
          )}
        </div>

        {/* Progress indicator */}
        {progress > 0 && (
          <div className="shrink-0 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>Reading Progress</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}