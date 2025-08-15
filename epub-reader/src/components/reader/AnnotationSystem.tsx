'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Button, Modal, Tooltip } from '@/components/ui';
import { readingService } from '@/services/readingService';
import type { Annotation as BaseAnnotation } from '@/types';
import { cn } from '@/utils';

// Extended annotation type for local use with additional EPUB-specific fields
interface Annotation extends Omit<BaseAnnotation, 'createdAt' | 'updatedAt'> {
  cfiRange?: string;
  selectedText?: string;
  noteContent?: string | null;
  chapterId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Type for EPUB.js rendition object
type EPUBContent = {
  window: Window;
  document: Document;
};

interface Rendition {
  annotations: {
    highlight: (cfi: string, data?: object, callback?: (e: MouseEvent) => void, className?: string, styles?: object) => void;
    remove: (cfi: string, type?: string) => void;
    mark: (cfi: string, data?: object, callback?: (e: MouseEvent) => void) => void;
    removeAll: () => void;
  };
  on(event: 'selected', callback: (cfiRange: string, contents: EPUBContent) => void): void;
  on(event: 'click', callback: (e: MouseEvent) => void): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  off: (event: string) => void;
  getContents: () => EPUBContent[];
  manager?: { container: HTMLElement };
  currentLocation: () => { start: { cfi: string; index?: number } };
  book?: { spine: { get: (id: string) => { index: number; href: string; idref: string } } };
  display?: (target: string | number) => Promise<void>;
}

interface AnnotationSystemProps {
  bookId: string;
  rendition: Rendition;
  onAnnotationClick?: (annotation: Annotation) => void;
  className?: string;
}

// Annotation colors
const annotationColors = [
  { name: 'Yellow', value: '#FFE066', rgb: 'rgb(255, 224, 102)' },
  { name: 'Red', value: '#FF6B6B', rgb: 'rgb(255, 107, 107)' },
  { name: 'Green', value: '#4ECDC4', rgb: 'rgb(78, 205, 196)' },
  { name: 'Blue', value: '#95E77E', rgb: 'rgb(149, 231, 126)' },
  { name: 'Purple', value: '#B4A7D6', rgb: 'rgb(180, 167, 214)' },
  { name: 'Pink', value: '#FFB6C1', rgb: 'rgb(255, 182, 193)' },
];

export const AnnotationSystem: React.FC<AnnotationSystemProps> = ({
  bookId,
  rendition,
  onAnnotationClick,
  className,
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionCfi, setSelectionCfi] = useState<string>('');
  const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(annotationColors[0]?.value || '#FFE066');
  // For future annotation editing functionality
  // @ts-expect-error - Intentionally unused for future feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [showAnnotationsList, setShowAnnotationsList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'highlight' | 'note' | 'bookmark'>('all');

  const menuRef = useRef<HTMLDivElement>(null);

  // Setup rendition hooks
  useEffect(() => {
    if (!rendition) return;

    // Handle text selection
    rendition.on('selected', (cfiRange, contents) => {
      const selection = contents.window.getSelection();
      if (selection && selection.toString().trim()) {
        handleTextSelection(selection, cfiRange);
      }
    });

    // Clear selection when clicking elsewhere
    rendition.on('click', () => {
      clearSelection();
    });

    // Render existing annotations
    renderAnnotations();

    return () => {
      // Cleanup
      rendition.off('selected');
      rendition.off('click');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendition, annotations]);

  // Load annotations from database
  const loadAnnotations = useCallback(async () => {
    try {
      const data = await readingService.getAnnotations(bookId);
      // Map database annotations to local format
      const mappedAnnotations: Annotation[] = data.map(ann => ({
        ...ann,
        cfiRange: ann.location, // Map location to cfiRange
        selectedText: ann.content,
        noteContent: ann.note,
        createdAt: ann.createdAt.toString(),
        updatedAt: ann.updatedAt.toString()
      }));
      setAnnotations(mappedAnnotations);
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  }, [bookId]);

  // Load annotations on mount and bookId change
  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  // Handle text selection
  const handleTextSelection = (selection: Selection, cfiRange: string) => {
    const text = selection.toString().trim();
    if (text.length === 0) return;

    setSelectedText(text);
    setSelectionCfi(cfiRange);

    // Get selection position for menu
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    setMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    
    setShowAnnotationMenu(true);
  };

  // Clear selection
  const clearSelection = () => {
    setShowAnnotationMenu(false);
    setSelectedText('');
    setSelectionCfi('');
    
    if (rendition && rendition.manager) {
      const contents = rendition.getContents();
      contents.forEach((content) => {
        content.window.getSelection()?.removeAllRanges();
      });
    }
  };

  // Create highlight
  const createHighlight = async (color?: string) => {
    if (!selectedText || !selectionCfi) return;

    try {
      const annotation = await readingService.createAnnotation({
        bookId,
        type: 'highlight',
        content: selectedText,
        location: selectionCfi,
        color: color || selectedColor,
        note: null,
        tags: [],
        isPrivate: false
      });

      const mappedAnnotation: Annotation = {
        ...annotation,
        cfiRange: annotation.location,
        selectedText: annotation.content,
        noteContent: annotation.note,
        chapterId: getCurrentChapter(),
        createdAt: annotation.createdAt.toString(),
        updatedAt: annotation.updatedAt.toString()
      };

      setAnnotations([...annotations, mappedAnnotation]);
      renderAnnotation(mappedAnnotation);
      clearSelection();
    } catch (error) {
      console.error('Failed to create highlight:', error);
    }
  };

  // Create note
  const createNote = async () => {
    if (!selectedText || !selectionCfi || !noteContent.trim()) return;

    try {
      const annotation = await readingService.createAnnotation({
        bookId,
        type: 'note',
        cfiRange: selectionCfi,
        selectedText,
        noteContent: noteContent.trim(),
        color: selectedColor,
        chapterId: getCurrentChapter(),
      });

      setAnnotations([...annotations, annotation]);
      renderAnnotation(annotation);
      
      setNoteContent('');
      setShowNoteModal(false);
      clearSelection();
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  // Create bookmark
  const createBookmark = async () => {
    try {
      const currentCfi = rendition.currentLocation().start.cfi;
      
      const annotation = await readingService.createAnnotation({
        bookId,
        type: 'bookmark',
        cfiRange: currentCfi,
        chapterId: getCurrentChapter(),
      });

      setAnnotations([...annotations, annotation]);
      clearSelection();
    } catch (error) {
      console.error('Failed to create bookmark:', error);
    }
  };

  // Update annotation (currently unused but kept for future use)
  // @ts-expect-error - Intentionally unused for future feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateAnnotation = async (id: string, updates: Partial<Annotation>) => {
    try {
      // Map local annotation format to API format
      const apiUpdates: Partial<BaseAnnotation> = {};
      if (updates.type !== undefined) apiUpdates.type = updates.type;
      if (updates.selectedText !== undefined) apiUpdates.content = updates.selectedText;
      if (updates.cfiRange !== undefined) apiUpdates.location = updates.cfiRange;
      if (updates.noteContent !== undefined) apiUpdates.note = updates.noteContent;
      if (updates.color !== undefined) apiUpdates.color = updates.color;
      if (updates.tags !== undefined) apiUpdates.tags = updates.tags;
      if (updates.isPrivate !== undefined) apiUpdates.isPrivate = updates.isPrivate;
      
      const updated = await readingService.updateAnnotation(id, apiUpdates);
      
      const mappedAnnotation: Annotation = {
        ...updated,
        cfiRange: updated.location,
        selectedText: updated.content,
        noteContent: updated.note,
        createdAt: updated.createdAt.toString(),
        updatedAt: updated.updatedAt.toString()
      };
      
      setAnnotations(annotations.map(a => a.id === id ? mappedAnnotation : a));
      renderAnnotations();
    } catch (error) {
      console.error('Failed to update annotation:', error);
    }
  };

  // Delete annotation
  const deleteAnnotation = async (id: string) => {
    try {
      await readingService.deleteAnnotation(id);
      setAnnotations(annotations.filter(a => a.id !== id));
      
      // Remove from rendition
      const annotation = annotations.find(a => a.id === id);
      if (annotation && rendition) {
        const cfi = annotation.cfiRange || annotation.location;
        if (cfi) {
          rendition.annotations.remove(cfi, 'highlight');
        }
      }
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  // Render annotation in the book
  const renderAnnotation = (annotation: Annotation) => {
    if (!rendition) return;

    const color = annotation.color || annotationColors[0]?.value || '#FFE066';
    
    if (annotation.type === 'highlight' || annotation.type === 'note') {
      const cfi = annotation.cfiRange || annotation.location;
      if (!cfi) return;
      
      rendition.annotations.highlight(
        cfi,
        { id: annotation.id },
        (e: MouseEvent) => {
          e.stopPropagation();
          handleAnnotationClick(annotation);
        },
        'highlight',
        {
          'background-color': color + '40', // Add transparency
          'cursor': 'pointer',
        }
      );
    } else if (annotation.type === 'bookmark') {
      const cfi = annotation.cfiRange || annotation.location;
      if (!cfi) return;
      
      rendition.annotations.mark(
        cfi,
        { id: annotation.id },
        (e: MouseEvent) => {
          e.stopPropagation();
          handleAnnotationClick(annotation);
        }
      );
    }
  };

  // Render all annotations
  const renderAnnotations = () => {
    if (!rendition) return;

    // Clear existing annotations
    rendition.annotations.removeAll();

    // Render each annotation
    annotations.forEach(renderAnnotation);
  };

  // Handle annotation click
  const handleAnnotationClick = (annotation: Annotation) => {
    setEditingAnnotation(annotation);
    onAnnotationClick?.(annotation);
  };

  // Get current chapter
  const getCurrentChapter = (): string => {
    if (!rendition) return '';
    
    const location = rendition.currentLocation();
    return location?.start?.index?.toString() || '';
  };

  // Navigate to annotation
  const navigateToAnnotation = (annotation: Annotation) => {
    if (!rendition || !rendition.display) return;
    
    const cfi = annotation.cfiRange || annotation.location;
    if (!cfi) return;
    
    rendition.display(cfi);
    setShowAnnotationsList(false);
  };

  // Export annotations
  const exportAnnotations = () => {
    const data = {
      bookId,
      annotations: annotations.map(a => ({
        type: a.type,
        text: a.selectedText,
        note: a.noteContent,
        color: a.color,
        chapter: a.chapterId,
        createdAt: a.createdAt,
      })),
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `annotations-${bookId}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import annotations
  const importAnnotations = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.bookId !== bookId) {
        throw new Error('Annotations are for a different book');
      }

      // Import each annotation
      for (const item of data.annotations) {
        await readingService.createAnnotation({
          bookId,
          type: item.type,
          selectedText: item.text,
          noteContent: item.note,
          color: item.color,
          chapterId: item.chapter,
        });
      }

      // Reload annotations
      await loadAnnotations();
    } catch (error) {
      console.error('Failed to import annotations:', error);
    }
  };

  // Filter annotations
  const filteredAnnotations = annotations.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) {
      return false;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        a.selectedText?.toLowerCase().includes(query) ||
        a.noteContent?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  return (
    <>
      {/* Annotation selection menu */}
      {showAnnotationMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex gap-1"
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {/* Color picker */}
          <div className="flex gap-1 mr-2">
            {annotationColors.map((color) => (
              <Tooltip key={color.value} content={color.name}>
                <button
                  onClick={() => {
                    setSelectedColor(color.value);
                    createHighlight(color.value);
                  }}
                  className={cn(
                    'w-6 h-6 rounded-full border-2',
                    selectedColor === color.value
                      ? 'border-gray-900 dark:border-white'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: color.value }}
                  aria-label={`Highlight in ${color.name}`}
                />
              </Tooltip>
            ))}
          </div>

          {/* Action buttons */}
          <Tooltip content="Add Note">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setShowNoteModal(true);
                setShowAnnotationMenu(false);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </Button>
          </Tooltip>

          <Tooltip content="Copy">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                navigator.clipboard.writeText(selectedText);
                clearSelection();
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </Button>
          </Tooltip>
        </div>
      )}

      {/* Note modal */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          clearSelection();
        }}
        title="Add Note"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowNoteModal(false);
                clearSelection();
              }}
            >
              Cancel
            </Button>
            <Button onClick={createNote}>Save Note</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-sm italic">&ldquo;{selectedText}&rdquo;</p>
          </div>
          
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add your note..."
            className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-purple-600"
            autoFocus
          />

          <div className="flex gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Color:</span>
            {annotationColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={cn(
                  'w-6 h-6 rounded-full border-2',
                  selectedColor === color.value
                    ? 'border-gray-900 dark:border-white'
                    : 'border-transparent'
                )}
                style={{ backgroundColor: color.value }}
                aria-label={color.name}
              />
            ))}
          </div>
        </div>
      </Modal>

      {/* Annotations list modal */}
      <Modal
        isOpen={showAnnotationsList}
        onClose={() => setShowAnnotationsList(false)}
        title="Annotations"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search and filter */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search annotations..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
            />
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'highlight' | 'note' | 'bookmark')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
            >
              <option value="all">All</option>
              <option value="highlight">Highlights</option>
              <option value="note">Notes</option>
              <option value="bookmark">Bookmarks</option>
            </select>
          </div>

          {/* Export/Import buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportAnnotations}>
              Export
            </Button>
            <label>
              <Button variant="outline" size="sm">
                Import
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importAnnotations(file);
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* Annotations list */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredAnnotations.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No annotations found</p>
            ) : (
              filteredAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => navigateToAnnotation(annotation)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {annotation.type === 'bookmark' ? (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                          <span className="text-sm font-medium">Bookmark</span>
                        </div>
                      ) : (
                        <>
                          {annotation.selectedText && (
                            <p
                              className="text-sm italic mb-2"
                              style={{
                                backgroundColor: annotation.color ? annotation.color + '40' : undefined,
                                padding: annotation.color ? '2px 4px' : undefined,
                                borderRadius: '2px',
                              }}
                            >
                              &ldquo;{annotation.selectedText}&rdquo;
                            </p>
                          )}
                          {annotation.noteContent && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {annotation.noteContent}
                            </p>
                          )}
                        </>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Chapter {annotation.chapterId || 'Unknown'}</span>
                        <span>{new Date(annotation.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnnotation(annotation.id);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Floating annotation button */}
      <div className={cn('fixed bottom-4 left-4 flex gap-2', className)}>
        <Tooltip content="Bookmark">
          <Button
            variant="primary"
            size="icon"
            onClick={createBookmark}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </Button>
        </Tooltip>

        <Tooltip content="View Annotations">
          <Button
            variant="primary"
            size="icon"
            onClick={() => setShowAnnotationsList(true)}
          >
            <span className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {annotations.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {annotations.length}
                </span>
              )}
            </span>
          </Button>
        </Tooltip>
      </div>
    </>
  );
};