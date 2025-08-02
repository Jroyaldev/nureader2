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
  onJumpToAnnotation: (location: string) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fbbf24', bg: 'bg-yellow-400' },
  { name: 'Green', value: '#10b981', bg: 'bg-emerald-500' },
  { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-500' },
  { name: 'Red', value: '#ef4444', bg: 'bg-red-500' },
  { name: 'Purple', value: '#8b5cf6', bg: 'bg-violet-500' }
];

export default function AnnotationPanel({ bookId, isOpen, onClose, onJumpToAnnotation }: AnnotationPanelProps) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-6 right-6 w-[380px] max-w-[90vw] z-[70] pointer-events-auto transition-elegant">
      {/* Panel surface - Apple style */}
      <div className="floating rounded-[var(--radius-xl)] overflow-hidden flex flex-col h-[calc(100vh-48px)]" style={{
        boxShadow: "0 25px 80px -12px rgba(0, 0, 0, 0.25), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))"
      }}>
        {/* Header - Refined */}
        <div className="sticky top-0 z-20 backdrop-blur-xl bg-[rgba(var(--surface),0.8)]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(var(--border),var(--border-opacity))]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius)] bg-[rgb(var(--accent))] flex items-center justify-center">
                <PaintBrushIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground tracking-tight">Annotations</h2>
                <p className="text-xs text-muted font-medium">{filteredAnnotations.length} {filteredAnnotations.length === 1 ? 'item' : 'items'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-icon -mr-2"
              aria-label="Close annotations"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="3" x2="11" y2="11" />
                <line x1="11" y1="3" x2="3" y2="11" />
              </svg>
            </button>
          </div>

          {/* Segmented control - Apple style */}
          <div className="px-4 pb-4 pt-3">
            <div className="segmented-control">
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
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-[rgba(var(--accent),0.2)] border-t-[rgb(var(--accent))] rounded-full animate-spin" />
            </div>
          ) : filteredAnnotations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 mx-auto mb-4 rounded-[var(--radius)] bg-[rgba(var(--muted),0.08)] flex items-center justify-center">
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
                  className="card rounded-[var(--radius-lg)] p-4 hover:shadow-lg transition-elegant cursor-pointer group"
                  onClick={() => onJumpToAnnotation(annotation.location)}
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
                        <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-emerald-500/10 flex items-center justify-center">
                          <BookmarkIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                        className="btn-icon w-7 h-7 text-red-500"
                        aria-label="Delete annotation"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    {annotation.content && (
                      <div className="bg-[rgba(var(--muted),0.05)] rounded-[var(--radius)] p-3">
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
                          className="w-full p-3 text-sm border border-[rgba(var(--border),var(--border-opacity))] rounded-[var(--radius)] bg-[rgba(var(--surface),0.5)] resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/40 focus:border-transparent font-medium"
                          rows={3}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAnnotationNote(annotation.id, editText);
                            }}
                            className="btn-primary"
                          >
                            Save
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNote(null);
                              setEditText('');
                            }}
                            className="btn-secondary"
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
