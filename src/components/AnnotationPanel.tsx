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
    <div className="fixed inset-y-0 right-0 w-96 floating-premium border-l border-gray-200/30 dark:border-gray-700/30 shadow-2xl z-[9998] transform transition-all duration-300 rounded-l-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
            <PaintBrushIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Annotations</h2>
            <p className="text-sm text-muted">{filteredAnnotations.length} {filteredAnnotations.length === 1 ? 'item' : 'items'}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="control-btn"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200/30 dark:border-gray-700/30 bg-gray-50/50 dark:bg-gray-800/50">
        {[
          { key: 'all', label: 'All', icon: PaintBrushIcon },
          { key: 'highlight', label: 'Highlights', icon: PaintBrushIcon },
          { key: 'note', label: 'Notes', icon: ChatBubbleLeftIcon },
          { key: 'bookmark', label: 'Bookmarks', icon: BookmarkIcon }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`flex-1 px-3 py-3 text-xs font-medium transition-all duration-200 relative overflow-hidden ${
              filter === key
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {filter === key && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-600/10 dark:from-blue-400/10 dark:to-blue-500/10" />
            )}
            <div className="relative z-10 flex flex-col items-center gap-1">
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </div>
            {filter === key && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[calc(100vh-180px)] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-3 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
              <p className="text-sm text-muted">Loading annotations...</p>
            </div>
          </div>
        ) : filteredAnnotations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center">
              <PaintBrushIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">No {filter === 'all' ? 'annotations' : filter + 's'} yet</h3>
            <p className="text-muted text-sm max-w-xs mx-auto leading-relaxed">
              {filter === 'all' && 'Start highlighting text or adding bookmarks to see them here'}
              {filter === 'highlight' && 'Select text and choose a highlight color to create your first highlight'}
              {filter === 'note' && 'Add notes to remember your thoughts about important passages'}
              {filter === 'bookmark' && 'Bookmark important locations in your book for quick access'}
            </p>
          </div>
        ) : (
          filteredAnnotations.map((annotation) => (
            <div
              key={annotation.id}
              className="group annotation-card floating rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200/30 dark:border-gray-700/30 hover:border-blue-300/50 dark:hover:border-blue-600/50"
              onClick={() => onJumpToAnnotation(annotation.location)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  {annotation.annotation_type === 'highlight' && (
                    <div 
                      className="w-4 h-4 rounded-lg shadow-sm border border-white/20"
                      style={{ backgroundColor: annotation.color }}
                    />
                  )}
                  {annotation.annotation_type === 'note' && (
                    <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <ChatBubbleLeftIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {annotation.annotation_type === 'bookmark' && (
                    <div className="w-4 h-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <BookmarkIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <span className="text-xs text-muted font-medium">
                    {formatDate(annotation.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNote(annotation.id);
                      setEditText(annotation.note || '');
                    }}
                    className="control-btn !w-7 !h-7 text-blue-600 dark:text-blue-400"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnnotation(annotation.id);
                    }}
                    className="control-btn !w-7 !h-7 text-red-500 dark:text-red-400"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3">
                {annotation.content && (
                  <div className="relative">
                    <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
                    <p className="text-sm leading-relaxed pl-4 text-foreground font-medium italic">
                      "{annotation.content}"
                    </p>
                  </div>
                )}
                
                {editingNote === annotation.id ? (
                  <div className="space-y-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-3 -m-1">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="Add your note..."
                      className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      rows={3}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNote(null);
                          setEditText('');
                        }}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAnnotationNote(annotation.id, editText);
                        }}
                        className="btn-primary text-xs px-4 py-1.5"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : annotation.note && (
                  <div className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 dark:to-transparent rounded-lg p-3 -mx-1">
                    <p className="text-sm text-foreground leading-relaxed">
                      {annotation.note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}