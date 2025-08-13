"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  ChatBubbleLeftIcon, 
  BookmarkIcon, 
  PaintBrushIcon,
  XMarkIcon,
  TrashIcon,
  PencilIcon
} from "@heroicons/react/24/outline";

interface Annotation {
  id: string;
  user_id: string;
  book_id: string;
  content: string;
  note: string | null;
  location: string;
  annotation_type: 'highlight' | 'note' | 'bookmark';
  color: string;
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
    if (filter === 'all') return true;
    return annotation.annotation_type === filter;
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
      transition-all duration-500 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}
    `}>
      {/* Panel surface - match TOC glass style */}
      <div className="reader-floating no-top-glint rounded-2xl flex flex-col h-full">
        {/* Header - Refined */}
        <div className="shrink-0 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgb(var(--accent))]/20 to-[rgb(var(--accent))]/10 flex items-center justify-center">
                <PaintBrushIcon className="w-5 h-5 text-[rgb(var(--accent))]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground tracking-tight">Annotations</h2>
                <p className="text-xs text-muted font-medium">{filteredAnnotations.length} {filteredAnnotations.length === 1 ? 'item' : 'items'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg hover:bg-[rgba(var(--muted),0.1)] transition-colors"
              aria-label="Close annotations"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Filter buttons */}
          <div className="px-4 pb-4">
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'highlight', label: 'Highlights' },
                { key: 'note', label: 'Notes' },
                { key: 'bookmark', label: 'Bookmarks' }
              ].map(({ key, label }) => {
                const active = filter === (key as any);
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      active 
                        ? 'bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]' 
                        : 'bg-[rgba(var(--muted),0.05)] hover:bg-[rgba(var(--muted),0.1)] text-muted'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-[rgba(var(--accent),0.2)] border-t-[rgb(var(--accent))] rounded-full animate-spin" />
            </div>
          ) : filteredAnnotations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[rgba(var(--muted),0.08)] flex items-center justify-center">
                <PaintBrushIcon className="w-6 h-6 text-muted" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1 tracking-tight">No annotations yet</h3>
              <p className="text-xs text-muted font-medium">Start highlighting text or adding bookmarks</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="bg-[rgba(var(--muted),0.03)] rounded-lg p-4 hover:bg-[rgba(var(--muted),0.05)] transition-all cursor-pointer group"
                  onClick={() => onJumpToAnnotation(annotation.location, annotation.id)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      {annotation.annotation_type === 'highlight' && (
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ 
                            backgroundColor: getColorInfo(annotation.color).value,
                            boxShadow: `0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px ${getColorInfo(annotation.color).value}40`
                          }}
                          aria-hidden
                        />
                      )}
                      {annotation.annotation_type === 'note' && (
                        <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[rgba(var(--accent),0.1)] flex items-center justify-center">
                          <ChatBubbleLeftIcon className="w-4 h-4 text-[rgb(var(--accent))]" />
                        </div>
                      )}
                      {annotation.annotation_type === 'bookmark' && (
                        <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[rgba(var(--accent),0.1)] flex items-center justify-center">
                          <BookmarkIcon className="w-4 h-4 text-[rgb(var(--accent))]" />
                        </div>
                      )}
                      <span className="text-xs text-muted font-medium tabular-nums">{formatDate(annotation.created_at)}</span>
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
                    {annotation.content && (
                      <div className="bg-[rgba(var(--muted),0.04)] rounded-lg p-3">
                        <p className="text-sm leading-relaxed italic text-foreground/85">
                          "{annotation.content}"
                        </p>
                      </div>
                    )}

                    {editingNote === annotation.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          placeholder="Add your note..."
                          className="w-full p-3 text-sm rounded-lg bg-[rgba(var(--muted),0.05)] resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/20 font-medium"
                          rows={3}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAnnotationNote(annotation.id, editText);
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/15"
                          >
                            Save
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNote(null);
                              setEditText('');
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[rgba(var(--muted),0.05)] hover:bg-[rgba(var(--muted),0.1)] text-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : annotation.note && (
                      <p className="text-sm text-foreground leading-relaxed font-medium">
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
