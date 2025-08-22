'use client';

import React from 'react';
import { useAIContext } from '@/lib/ai-context';
import { Highlighter, StickyNote, Bookmark, Check, X } from 'lucide-react';

interface AnnotationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnnotationSelector({ isOpen, onClose }: AnnotationSelectorProps) {
  const { 
    annotations, 
    selectedAnnotations, 
    toggleAnnotationSelection,
    clearSelectedAnnotations 
  } = useAIContext();

  if (!isOpen) return null;

  const getAnnotationIcon = (type: string) => {
    switch (type) {
      case 'highlight':
        return <Highlighter className="w-4 h-4" />;
      case 'note':
        return <StickyNote className="w-4 h-4" />;
      case 'bookmark':
        return <Bookmark className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getAnnotationColor = (color?: string) => {
    switch (color) {
      case 'yellow':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'green':
        return 'bg-green-500/20 border-green-500/30';
      case 'blue':
        return 'bg-blue-500/20 border-blue-500/30';
      case 'pink':
        return 'bg-pink-500/20 border-pink-500/30';
      case 'sage':
        return 'bg-green-600/20 border-green-600/30';
      default:
        return 'bg-zinc-800/50 border-zinc-700/50';
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] md:max-h-[80vh] bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 backdrop-blur-xl border border-zinc-800/50 rounded-xl md:rounded-2xl shadow-2xl flex flex-col mx-2 md:mx-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-zinc-800/50">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-zinc-100">Select Annotations</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Choose highlights, notes, and bookmarks to include in your AI conversation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2 border-b border-zinc-800/50">
          <div className="text-sm text-zinc-400">
            {selectedAnnotations.length} of {annotations.length} selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                annotations.forEach(annotation => {
                  if (!selectedAnnotations.find(a => a.id === annotation.id)) {
                    toggleAnnotationSelection(annotation);
                  }
                });
              }}
              className="px-3 py-1 text-xs bg-zinc-800/50 hover:bg-zinc-800/70 border border-zinc-700/50 rounded-lg text-zinc-300 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={clearSelectedAnnotations}
              className="px-3 py-1 text-xs bg-zinc-800/50 hover:bg-zinc-800/70 border border-zinc-700/50 rounded-lg text-zinc-300 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Annotations List */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          {annotations.length === 0 ? (
            <div className="text-center py-12">
              <Highlighter className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 text-sm">No annotations available</p>
              <p className="text-zinc-500 text-xs mt-1">
                Create highlights and notes while reading to use them with AI
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {annotations.map(annotation => {
                const isSelected = selectedAnnotations.some(a => a.id === annotation.id);
                return (
                  <button
                    key={annotation.id}
                    onClick={() => toggleAnnotationSelection(annotation)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected 
                        ? 'bg-green-600/20 border-green-600/30' 
                        : getAnnotationColor(annotation.color)
                    } hover:bg-opacity-30`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${isSelected ? 'text-green-400' : 'text-zinc-400'}`}>
                        {getAnnotationIcon(annotation.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {annotation.text && (
                          <div className="text-sm text-zinc-200 line-clamp-2 mb-1">
                            "{annotation.text}"
                          </div>
                        )}
                        {annotation.note && (
                          <div className="text-xs text-zinc-400 italic line-clamp-2">
                            Note: {annotation.note}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-zinc-500">
                            {annotation.type}
                          </span>
                          {annotation.createdAt && (
                            <>
                              <span className="text-zinc-600">•</span>
                              <span className="text-xs text-zinc-500">
                                {new Date(annotation.createdAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="ml-2">
                        {isSelected && (
                          <div className="w-5 h-5 bg-green-600/30 border border-green-600/50 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-green-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 md:p-4 border-t border-zinc-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-zinc-800/50 hover:bg-zinc-800/70 border border-zinc-700/50 rounded-lg text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 rounded-lg text-green-400 transition-colors"
          >
            Done ({selectedAnnotations.length} selected)
          </button>
        </div>
      </div>
    </div>
  );
}