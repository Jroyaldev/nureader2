"use client";

import React, { useState, useEffect, useRef } from 'react';
import Tooltip from './Tooltip';

interface NoteModalProps {
  isOpen: boolean;
  selectedText: string;
  initialNote?: string;
  onSave: (note: string, highlight?: string) => void;
  onCancel: () => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fef3c7', border: '#f59e0b', icon: '🟡' },
  { name: 'Green', value: '#d1fae5', border: '#10b981', icon: '🟢' },
  { name: 'Blue', value: '#dbeafe', border: '#3b82f6', icon: '🔵' },
  { name: 'Pink', value: '#fce7f3', border: '#ec4899', icon: '🩷' },
  { name: 'Purple', value: '#e9d5ff', border: '#8b5cf6', icon: '🟣' },
];

export default function NoteModal({
  isOpen,
  selectedText,
  initialNote = '',
  onSave,
  onCancel
}: NoteModalProps) {
  const [note, setNote] = useState(initialNote);
  const [selectedHighlight, setSelectedHighlight] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
      // Focus textarea when modal opens
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialNote]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onCancel]);

  const handleSave = () => {
    onSave(note, selectedHighlight);
    setNote('');
    setSelectedHighlight('');
  };

  const handleCancel = () => {
    onCancel();
    setNote('');
    setSelectedHighlight('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-[10002] animate-fade-in">
      <div className="floating-premium rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Add Note</h3>
              <p className="text-sm text-muted">Create a note for this selection</p>
            </div>
          </div>
          <Tooltip content="Close (Esc)" position="left">
            <button
              onClick={handleCancel}
              className="control-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Tooltip>
        </div>

        {/* Selected Text Preview */}
        {selectedText && (
          <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-xs font-medium text-muted mb-2">Selected text:</div>
            <div className="text-sm text-foreground italic line-clamp-3">
              "{selectedText}"
            </div>
          </div>
        )}

        {/* Highlight Color Picker */}
        <div className="mb-4">
          <div className="text-sm font-medium text-foreground mb-2">Highlight color (optional):</div>
          <div className="flex gap-2 flex-wrap">
            <Tooltip content="No highlight" position="top">
              <button
                onClick={() => setSelectedHighlight('')}
                className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center ${
                  selectedHighlight === '' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Tooltip>
            {HIGHLIGHT_COLORS.map((color) => (
              <Tooltip key={color.name} content={color.name} position="top">
                <button
                  onClick={() => setSelectedHighlight(color.value)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center text-xs ${
                    selectedHighlight === color.value ? 'border-blue-500 scale-105' : ''
                  }`}
                  style={{
                    backgroundColor: color.value,
                    borderColor: selectedHighlight === color.value ? '#3b82f6' : color.border,
                  }}
                >
                  {color.icon}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Note Textarea */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Your note:
          </label>
          <textarea
            ref={textareaRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write your thoughts about this passage..."
            className="w-full h-32 p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-foreground placeholder-muted resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            autoFocus
          />
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-muted">
              {note.length}/1000 characters
            </div>
            <div className="text-xs text-muted">
              Press Ctrl+Enter to save
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="btn-secondary px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!note.trim()}
            className={`btn-primary px-6 py-2 ${
              !note.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}