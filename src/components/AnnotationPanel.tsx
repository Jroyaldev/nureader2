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
    <div className="fixed inset-y-0 right-0 w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-l border-gray-200/50 dark:border-gray-700/50 shadow-2xl z-50 transform transition-transform duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
            <PaintBrushIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Annotations</h2>
            <p className="text-sm text-muted">{filteredAnnotations.length} items</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200/50 dark:border-gray-700/50">
        {[
          { key: 'all', label: 'All', icon: PaintBrushIcon },
          { key: 'highlight', label: 'Highlights', icon: PaintBrushIcon },
          { key: 'note', label: 'Notes', icon: ChatBubbleLeftIcon },
          { key: 'bookmark', label: 'Bookmarks', icon: BookmarkIcon }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              filter === key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-muted hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Icon className="w-4 h-4 mx-auto mb-1" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-200px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
          </div>
        ) : filteredAnnotations.length === 0 ? (
          <div className="text-center py-12">
            <PaintBrushIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">No annotations yet</h3>
            <p className="text-muted text-sm">Start highlighting text or adding bookmarks to see them here</p>
          </div>
        ) : (
          filteredAnnotations.map((annotation) => (
            <div
              key={annotation.id}
              className="bg-surface rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onJumpToAnnotation(annotation.location)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {annotation.annotation_type === 'highlight' && (
                    <div 
                      className={`w-4 h-4 rounded ${getColorInfo(annotation.color).bg}`}
                    />
                  )}
                  {annotation.annotation_type === 'note' && (
                    <ChatBubbleLeftIcon className="w-4 h-4 text-blue-500" />
                  )}
                  {annotation.annotation_type === 'bookmark' && (
                    <BookmarkIcon className="w-4 h-4 text-green-500" />
                  )}
                  <span className="text-xs text-muted">
                    {formatDate(annotation.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNote(annotation.id);
                      setEditText(annotation.note || '');
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnnotation(annotation.id);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-red-500"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                {annotation.content && (
                  <p className="text-sm leading-relaxed bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 italic">
                    "{annotation.content}"
                  </p>
                )}
                
                {editingNote === annotation.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="Add your note..."
                      className="w-full p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAnnotationNote(annotation.id, editText);
                        }}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNote(null);
                          setEditText('');
                        }}
                        className="btn-secondary text-xs px-3 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : annotation.note && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {annotation.note}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}