"use client";

import { 
  ChatBubbleLeftIcon, 
  BookmarkIcon, 
  PaintBrushIcon,
  XMarkIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import { useState, useEffect, useCallback } from "react";

import { createClient } from "@/utils/supabase/client";

interface Annotation {
  id: string;
  user_id: string;
  book_id: string;
  content: string;
  note: string | null;
  location: string;
  annotation_type: 'highlight' | 'note' | 'bookmark';
  color: string;
  chapter_info?: string | null;
  created_at: string;
  updated_at: string;
}

interface AnnotationPanelProps {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
  onJumpToAnnotation: (location: string, annotationId: string) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'rgba(251, 191, 36, 0.5)', bg: 'bg-yellow-400' },
  { name: 'Green', value: 'rgba(16, 185, 129, 0.5)', bg: 'bg-emerald-500' },
  { name: 'Blue', value: 'rgba(59, 130, 246, 0.5)', bg: 'bg-blue-500' },
  { name: 'Red', value: 'rgba(239, 68, 68, 0.5)', bg: 'bg-red-500' },
  { name: 'Purple', value: 'rgba(139, 92, 246, 0.5)', bg: 'bg-violet-500' }
];

export default function AnnotationPanel({ bookId, isOpen, onClose, onJumpToAnnotation, onDeleteAnnotation }: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'highlight' | 'note' | 'bookmark'>('all');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  
  const supabase = createClient();

  const fetchAnnotations = useCallback(async () => {
    if (!bookId) return;
    
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnotations(data || []);
    } catch (error) {
      console.error('Error fetching annotations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [bookId, supabase]);

  useEffect(() => {
    if (isOpen) {
      fetchAnnotations();
    }
  }, [isOpen, fetchAnnotations]);

  const deleteAnnotation = async (annotationId: string) => {
    try {
      const { error } = await supabase
        .from('annotations')
        .delete()
        .eq('id', annotationId);

      if (error) throw error;
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      
      // Notify parent component to remove from renderer
      if (onDeleteAnnotation) {
        onDeleteAnnotation(annotationId);
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
    }
  };

  const updateAnnotationNote = async (annotationId: string, note: string) => {
    try {
      const { error } = await supabase
        .from('annotations')
        .update({ 
          note: note || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', annotationId);

      if (error) throw error;
      
      setAnnotations(prev => 
        prev.map(a => 
          a.id === annotationId 
            ? { ...a, note: note || null, updated_at: new Date().toISOString() }
            : a
        )
      );
      setEditingNote(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating annotation:', error);
    }
  };

  const filteredAnnotations = annotations.filter(annotation => {
    // Type filter
    if (filter !== 'all' && annotation.annotation_type !== filter) return false;
    
    // Color filter (for highlights)
    if (selectedColor && annotation.annotation_type === 'highlight' && annotation.color !== selectedColor) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesContent = annotation.content?.toLowerCase().includes(query);
      const matchesNote = annotation.note?.toLowerCase().includes(query);
      return matchesContent || matchesNote;
    }
    
    return true;
  });

  const getColorInfo = (color: string) => {
    return HIGHLIGHT_COLORS.find(c => c.value === color) || HIGHLIGHT_COLORS[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`
      fixed right-6 top-1/2 -translate-y-1/2 z-[85] w-[380px] h-[min(700px,90vh)]
      transition-all duration-500 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}
    `}>
      {/* Panel surface - glassmorphism styling */}
      <div className="modal-glass rounded-2xl flex flex-col h-full font-inter">
        {/* Header - Refined */}
        <div className="shrink-0 modal-header">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                <PaintBrushIcon className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground tracking-tight font-inter">Annotations</h2>
                <p className="text-xs text-muted font-medium font-inter">{filteredAnnotations.length} {filteredAnnotations.length === 1 ? 'item' : 'items'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg hover:bg-white/10 dark:hover:bg-gray-800/20 transition-colors font-inter"
              aria-label="Close annotations"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="px-4 pb-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search annotations..."
                className="w-full pl-9 pr-3 py-2 text-xs modal-input rounded-lg focus:outline-none placeholder:text-muted-foreground/50 font-inter"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 dark:hover:bg-gray-800/20 rounded transition-colors font-inter"
                >
                  <XMarkIcon className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Filter buttons */}
          <div className="px-4 pb-3">
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'highlight', label: 'Highlights' },
                { key: 'note', label: 'Notes' },
                { key: 'bookmark', label: 'Bookmarks' }
              ].map(({ key, label }) => {
                const active = filter === (key as 'all' | 'highlight' | 'note' | 'bookmark');
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key as 'all' | 'highlight' | 'note' | 'bookmark')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors font-inter ${
                      active 
                        ? 'bg-blue-500/10 text-blue-500' 
                        : 'bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30 text-muted'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Color filters for highlights */}
          {filter === 'highlight' && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Color:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setSelectedColor(null)}
                    className={`px-2 py-1 text-[10px] font-medium rounded transition-colors font-inter ${
                      !selectedColor ? 'bg-white/30 dark:bg-gray-800/30 text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  {HIGHLIGHT_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${
                        selectedColor === color.value 
                          ? 'border-foreground scale-110' 
                          : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : filteredAnnotations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/20 dark:bg-gray-800/20 flex items-center justify-center">
                <PaintBrushIcon className="w-6 h-6 text-muted" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1 tracking-tight font-inter">No annotations yet</h3>
              <p className="text-xs text-muted font-medium font-inter">Start highlighting text or adding bookmarks</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="bg-white/10 dark:bg-gray-800/10 rounded-lg p-4 hover:bg-white/20 dark:hover:bg-gray-800/20 transition-all cursor-pointer group relative overflow-hidden font-inter"
                  onClick={() => onJumpToAnnotation(annotation.location, annotation.id)}
                >
                  {/* Color stripe for highlights */}
                  {annotation.annotation_type === 'highlight' && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: annotation.color || 'rgba(251, 191, 36, 0.8)' }}
                      aria-hidden
                    />
                  )}
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      {annotation.annotation_type === 'highlight' && (
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white dark:border-black/20 shadow-sm"
                          style={{ 
                            backgroundColor: annotation.color || 'rgba(251, 191, 36, 0.5)',
                            boxShadow: `0 0 0 2px ${annotation.color || 'rgba(251, 191, 36, 0.5)'}40, 0 2px 4px rgba(0,0,0,0.1)`
                          }}
                          title={getColorInfo(annotation.color)?.name + ' highlight'}
                          aria-label={getColorInfo(annotation.color)?.name + ' highlight'}
                        />
                      )}
                      {annotation.annotation_type === 'note' && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 flex items-center justify-center">
                          <ChatBubbleLeftIcon className="w-4 h-4 text-indigo-500" />
                        </div>
                      )}
                      {annotation.annotation_type === 'bookmark' && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                            <BookmarkIcon className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground font-inter">Bookmark</span>
                            <span className="text-[10px] text-muted-foreground font-inter">
                              {annotation.chapter_info || 'Chapter location'}
                            </span>
                          </div>
                        </div>
                      )}
                      {annotation.annotation_type !== 'bookmark' && (
                        <div className="flex items-center gap-2 text-xs text-muted font-inter">
                          {annotation.chapter_info && (
                            <>
                              <span className="font-medium truncate max-w-[120px]" title={annotation.chapter_info}>
                                {annotation.chapter_info}
                              </span>
                              <span className="text-muted-foreground/50">•</span>
                            </>
                          )}
                          <span className="font-medium tabular-nums">{formatDate(annotation.created_at)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNote(annotation.id);
                          setEditText(annotation.note || '');
                        }}
                        className="btn-icon w-7 h-7"
                        aria-label="Edit note"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnotation(annotation.id);
                        }}
                          className="btn-icon w-7 h-7 text-red-500 dark:text-red-400"
                        aria-label="Delete annotation"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    {annotation.annotation_type === 'bookmark' ? (
                      <div className="flex items-center gap-2">
                        <BookmarkIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 shrink-0" />
                        <p className="text-sm font-medium text-foreground font-inter">
                          {annotation.content || 'Page bookmarked'}
                        </p>
                        {annotation.annotation_type === 'bookmark' && (
                          <span className="text-xs text-muted font-medium ml-auto tabular-nums font-inter">
                            {formatDate(annotation.created_at)}
                          </span>
                        )}
                      </div>
                    ) : annotation.content ? (
                      <div className="bg-white/20 dark:bg-gray-800/20 rounded-lg p-3">
                        <p className="text-sm leading-relaxed italic text-foreground/85 font-inter">
                          &ldquo;{annotation.content}&rdquo;
                        </p>
                      </div>
                    ) : null}

                    {editingNote === annotation.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          placeholder="Add your note..."
                          className="w-full p-3 text-sm rounded-lg bg-white/20 dark:bg-gray-800/20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium font-inter"
                          rows={3}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAnnotationNote(annotation.id, editText);
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/15 font-inter"
                          >
                            Save
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNote(null);
                              setEditText('');
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30 text-muted font-inter"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : annotation.note && (
                      <p className="text-sm text-foreground leading-relaxed font-medium font-inter">
                        {annotation.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
