"use client";

import {
  PencilIcon,
  ChatBubbleBottomCenterTextIcon,
  ShareIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import React, { useState, useEffect, useRef } from 'react';

export interface Annotation {
  id: string;
  bookId: string;
  userId: string;
  type: 'highlight' | 'note' | 'bookmark';
  color: string;
  text: string;
  note?: string;
  cfiRange: string;
  chapter?: string;
  page?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface FloatingSelectionToolbarProps {
  visible: boolean;
  position: { x: number; y: number };
  selectedText: string;
  onHighlight: (color: string) => void;
  onNote: () => void;
  onCopy: () => void;
  onShare: () => void;
  onClose: () => void;
}

const HIGHLIGHT_COLORS = [
  { value: '#fbbf24', name: 'Yellow', className: 'bg-yellow-400' },
  { value: '#34d399', name: 'Green', className: 'bg-emerald-400' },
  { value: '#60a5fa', name: 'Blue', className: 'bg-blue-400' },
  { value: '#f87171', name: 'Red', className: 'bg-red-400' },
  { value: '#c084fc', name: 'Purple', className: 'bg-purple-400' },
  { value: '#fb923c', name: 'Orange', className: 'bg-orange-400' }
];

export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  visible,
  position,
  selectedText,
  onHighlight,
  onNote,
  onCopy,
  onShare,
  onClose
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (visible && toolbarRef.current) {
      // Position toolbar above selection
      const toolbar = toolbarRef.current;
      const rect = toolbar.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      let adjustedX = position.x - rect.width / 2;
      let adjustedY = position.y - rect.height - 10;
      
      // Keep within viewport bounds
      if (adjustedX < 10) adjustedX = 10;
      if (adjustedX + rect.width > viewportWidth - 10) {
        adjustedX = viewportWidth - rect.width - 10;
      }
      if (adjustedY < 10) {
        adjustedY = position.y + 30; // Show below if no room above
      }
      
      toolbar.style.left = `${adjustedX}px`;
      toolbar.style.top = `${adjustedY}px`;
    }
  }, [visible, position]);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(selectedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy();
  };
  
  const handleHighlight = (color: string) => {
    onHighlight(color);
    setShowColorPicker(false);
  };
  
  if (!visible) return null;
  
  return (
    <div
      ref={toolbarRef}
      className="fixed z-[100] animate-scale-in"
      style={{ left: position.x, top: position.y }}
    >
      <div className="bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-1 flex items-center gap-0.5 font-inter">
        {/* Color Picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2.5 rounded-xl active:bg-black/5 dark:active:bg-white/10 transition-all group flex items-center gap-2 touch-manipulation font-inter"
            aria-label="Highlight"
            title="Highlight"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 via-emerald-400 to-purple-400" />
            <span className="text-xs font-medium pr-1">Highlight</span>
          </button>
          
          {showColorPicker && (
            <div className="absolute bottom-full mb-2 left-0 bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-2 flex gap-1 animate-slide-up font-inter">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleHighlight(color.value)}
                  className={`w-8 h-8 rounded-lg ${color.className} active:scale-110 transition-transform touch-manipulation`}
                  aria-label={`Highlight ${color.name}`}
                  title={color.name}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="w-px h-6 bg-black/10 dark:bg-white/10" />
        
        {/* Actions */}
        <button
          onClick={onNote}
          className="p-2.5 rounded-xl active:bg-black/5 dark:active:bg-white/10 transition-all group touch-manipulation font-inter"
          aria-label="Add Note"
          title="Add Note"
        >
          <ChatBubbleBottomCenterTextIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        
        <button
          onClick={handleCopy}
          className="p-2.5 rounded-xl active:bg-black/5 dark:active:bg-white/10 transition-all group touch-manipulation font-inter"
          aria-label="Copy"
          title={copied ? "Copied!" : "Copy"}
        >
          {copied ? (
            <CheckIcon className="w-5 h-5 text-emerald-500" />
          ) : (
            <ClipboardDocumentIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
          )}
        </button>
        
        <button
          onClick={onShare}
          className="p-2.5 rounded-xl active:bg-black/5 dark:active:bg-white/10 transition-all group touch-manipulation font-inter"
          aria-label="Share"
          title="Share"
        >
          <ShareIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        
        <div className="w-px h-6 bg-black/10 dark:bg-white/10" />
        
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl active:bg-black/5 dark:active:bg-white/10 transition-all group touch-manipulation font-inter"
          aria-label="Close"
        >
          <XMarkIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>
      
      {/* Selection Preview */}
      <div className="mt-2 bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-xl border border-white/20 p-3 max-w-xs font-inter">
        <p className="text-xs text-muted line-clamp-2">&ldquo;{selectedText}&rdquo;</p>
      </div>
    </div>
  );
};

interface AnnotationPanelProps {
  visible: boolean;
  annotations: Annotation[];
  onClose: () => void;
  onAnnotationClick: (annotation: Annotation) => void;
  onAnnotationEdit: (annotation: Annotation) => void;
  onAnnotationDelete: (id: string) => void;
  onExport: () => void;
}

type FilterType = 'all' | 'highlight' | 'note' | 'bookmark';
type SortBy = 'recent' | 'oldest' | 'chapter' | 'type';

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  visible,
  annotations,
  onClose,
  onAnnotationClick,
  onAnnotationEdit,
  onAnnotationDelete,
  onExport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // Extract all unique tags
  const allTags = Array.from(new Set(
    annotations.flatMap(a => a.tags || [])
  ));
  
  // Filter and sort annotations
  const processedAnnotations = React.useMemo(() => {
    let filtered = annotations;
    
    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(a => 
        selectedTags.every(tag => a.tags?.includes(tag))
      );
    }
    
    // Sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'recent':
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'chapter':
        sorted.sort((a, b) => (a.chapter || '').localeCompare(b.chapter || ''));
        break;
      case 'type':
        sorted.sort((a, b) => a.type.localeCompare(b.type));
        break;
    }
    
    return sorted;
  }, [annotations, filterType, searchQuery, selectedTags, sortBy]);
  
  // Group annotations by chapter
  const groupedAnnotations = React.useMemo(() => {
    const groups: Record<string, Annotation[]> = {};
    processedAnnotations.forEach(annotation => {
      const chapter = annotation.chapter || 'Unknown Chapter';
      if (!groups[chapter]) groups[chapter] = [];
      groups[chapter].push(annotation);
    });
    return groups;
  }, [processedAnnotations]);
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };
  
  return (
    <div className={`fixed right-0 top-0 h-full z-40 transition-all duration-300 ${
      visible ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="h-full w-96 bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-2xl border border-white/20 flex flex-col font-inter">
        {/* Header */}
        <div className="p-6 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <PencilIcon className="w-5 h-5" />
              Annotations
              <span className="text-sm font-normal text-muted">
                ({processedAnnotations.length})
              </span>
            </h2>
            <button
              onClick={onClose}
              className="p-2 active:bg-black/5 dark:active:bg-white/10 rounded-lg transition-colors touch-manipulation font-inter"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search annotations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/20 backdrop-blur-sm focus:border-blue-500/30 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-inter text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            {/* Type Filter */}
            <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-lg">
              {(['all', 'highlight', 'note', 'bookmark'] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all touch-manipulation font-inter ${
                    filterType === type
                      ? 'bg-blue-500 text-white'
                      : 'active:bg-black/5 dark:active:bg-white/10'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                  {type === 'all' && ` (${annotations.length})`}
                </button>
              ))}
            </div>
            
            {/* Sort & More Filters */}
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="p-2 active:bg-black/5 dark:active:bg-white/10 rounded-lg transition-colors touch-manipulation font-inter"
              aria-label="Filters"
            >
              <FunnelIcon className="w-4 h-4" />
            </button>
            
            {/* Export */}
            <button
              onClick={onExport}
              className="p-2 active:bg-black/5 dark:active:bg-white/10 rounded-lg transition-colors ml-auto touch-manipulation font-inter"
              aria-label="Export"
              title="Export Annotations"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags(prev =>
                      prev.includes(tag)
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                  className={`px-2 py-1 rounded-full text-xs transition-all touch-manipulation font-inter ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                      : 'bg-black/5 dark:bg-white/5 active:bg-black/10 dark:active:bg-white/10'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Annotations List */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(groupedAnnotations).map(([chapter, chapterAnnotations]) => (
            <div key={chapter} className="border-b border-black/5 dark:border-white/5">
              <div className="px-6 py-2 bg-black/5 dark:bg-white/5 sticky top-0 z-10">
                <h3 className="text-sm font-medium text-muted">{chapter}</h3>
              </div>
              
              <div className="px-6 py-3 space-y-3">
                {chapterAnnotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className="group cursor-pointer"
                    onClick={() => onAnnotationClick(annotation)}
                  >
                    <div className="p-3 rounded-xl active:bg-black/5 dark:active:bg-white/5 transition-all touch-manipulation">
                      {/* Annotation Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {annotation.type === 'highlight' && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: annotation.color }}
                            />
                          )}
                          {annotation.type === 'note' && (
                            <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-muted" />
                          )}
                          {annotation.type === 'bookmark' && (
                            <BookmarkSolidIcon className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="text-xs text-muted">
                            {formatDate(annotation.createdAt)}
                          </span>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnnotationEdit(annotation);
                            }}
                            className="p-1 active:bg-black/10 dark:active:bg-white/10 rounded transition-colors touch-manipulation font-inter"
                            aria-label="Edit"
                          >
                            <PencilIcon className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnnotationDelete(annotation.id);
                            }}
                            className="p-1 active:bg-red-500/10 text-red-500 rounded transition-colors touch-manipulation font-inter"
                            aria-label="Delete"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Highlighted Text */}
                      {annotation.text && (
                        <p className="text-sm mb-2 line-clamp-3">
                          &ldquo;{annotation.text}&rdquo;
                        </p>
                      )}
                      
                      {/* Note */}
                      {annotation.note && (
                        <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                          <p className="text-sm text-muted line-clamp-2">
                            {annotation.note}
                          </p>
                        </div>
                      )}
                      
                      {/* Tags */}
                      {annotation.tags && annotation.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {annotation.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {processedAnnotations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <SparklesIcon className="w-12 h-12 text-muted mb-4" />
              <h3 className="text-base font-medium mb-2">No annotations yet</h3>
              <p className="text-sm text-muted">
                {searchQuery || filterType !== 'all' || selectedTags.length > 0
                  ? 'Try adjusting your filters'
                  : 'Select text to create highlights and notes'}
              </p>
            </div>
          )}
        </div>
        
        {/* Sort Menu Dropdown */}
        {showFilterMenu && (
          <div className="absolute top-40 right-6 bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-2 z-50 animate-scale-in font-inter">
            <div className="text-xs font-medium text-muted px-3 py-2">Sort by</div>
            {(['recent', 'oldest', 'chapter', 'type'] as SortBy[]).map((sort) => (
              <button
                key={sort}
                onClick={() => {
                  setSortBy(sort);
                  setShowFilterMenu(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors flex items-center justify-between touch-manipulation font-inter ${
                  sortBy === sort
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'active:bg-black/5 dark:active:bg-white/10'
                }`}
              >
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
                {sortBy === sort && <CheckIcon className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};