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
  { name: 'Yellow', value: 'rgba(254, 243, 199, 0.5)', border: '#f59e0b', icon: '🟡' },
  { name: 'Green', value: 'rgba(209, 250, 229, 0.5)', border: '#10b981', icon: '🟢' },
  { name: 'Blue', value: 'rgba(219, 234, 254, 0.5)', border: '#3b82f6', icon: '🔵' },
  { name: 'Pink', value: 'rgba(252, 231, 243, 0.5)', border: '#ec4899', icon: '🩷' },
  { name: 'Purple', value: 'rgba(233, 213, 255, 0.5)', border: '#8b5cf6', icon: '🟣' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-xl"
      />
      <div
        className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-white/20 dark:border-gray-700/20 shadow-2xl rounded-2xl max-w-md w-full mx-4 animate-scale-in font-inter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 dark:border-gray-700/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white font-inter">Add Note</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-inter">Create a note for the selection</p>
            </div>
          </div>
          <Tooltip content="Close (Esc)" position="left">
            <button
              onClick={handleCancel}
              className="w-8 h-8 rounded-lg bg-white/10 dark:bg-gray-800/20 hover:bg-white/20 dark:hover:bg-gray-700/30 border border-white/10 dark:border-gray-700/20 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 flex items-center justify-center font-inter -mr-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="3" x2="11" y2="11" />
                <line x1="11" y1="3" x2="3" y2="11" />
              </svg>
            </button>
          </Tooltip>
        </div>

        <div className="p-6">
          {/* Selected Text Preview */}
          {selectedText && (
            <div className="mb-4 p-3 rounded-lg bg-white/30 dark:bg-gray-800/30 border border-white/20 dark:border-gray-700/20">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 font-inter">Selected text:</div>
              <div className="text-sm text-gray-900 dark:text-white italic line-clamp-3 font-inter">
                &ldquo;{selectedText}&rdquo;
              </div>
            </div>
          )}

          {/* Highlight Color Picker */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-2 font-inter">Highlight color (optional):</div>
            <div className="flex gap-2 flex-wrap">
              <Tooltip content="No highlight" position="top">
                <button
                  onClick={() => setSelectedHighlight('')}
                  className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center font-inter ${
                    selectedHighlight === ''
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/20 dark:border-gray-700/20 bg-white/20 dark:bg-gray-800/20'
                  }`}
                >
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Tooltip>
              {HIGHLIGHT_COLORS.map((color) => (
                <Tooltip key={color.name} content={color.name} position="top">
                  <button
                    onClick={() => setSelectedHighlight(color.value)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center text-xs font-inter ${
                      selectedHighlight === color.value ? 'border-blue-500 scale-105' : ''
                    }`}
                    style={{
                      backgroundColor: color.value,
                      borderColor: selectedHighlight === color.value ? '#3b82f6' : color.border,
                    }}
                  >
                    {/* The icon is sufficient, no need for text */}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Note Textarea */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 font-inter">
              Your note:
            </label>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write your thoughts about this passage..."
              className="w-full h-32 p-3 text-sm border border-white/20 dark:border-gray-700/20 rounded-lg bg-white/30 dark:bg-gray-800/30 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 font-inter"
              autoFocus
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-gray-600 dark:text-gray-400 font-inter">
                {note.length}/1000 characters
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-inter">
                Press Ctrl+Enter to save
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/20 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/20 rounded-lg hover:bg-white/30 dark:hover:bg-gray-700/30 transition-all duration-200 font-inter"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!note.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed border border-blue-500 hover:border-blue-600 disabled:border-gray-400 rounded-lg transition-all duration-200 font-inter"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}