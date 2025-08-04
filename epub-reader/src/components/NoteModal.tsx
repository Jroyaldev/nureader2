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
        className="absolute inset-0 bg-[rgba(var(--bg),0.8)] backdrop-blur-xl"
      />
      <div
        className="relative floating rounded-[var(--radius-2xl)] max-w-md w-full mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(var(--border),var(--border-opacity))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[rgb(var(--accent))] rounded-[var(--radius)] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Add Note</h3>
              <p className="text-sm text-muted">Create a note for the selection</p>
            </div>
          </div>
          <Tooltip content="Close (Esc)" position="left">
            <button
              onClick={handleCancel}
              className="btn-icon -mr-2"
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
            <div className="mb-4 p-3 rounded-[var(--radius)] bg-[rgba(var(--muted),0.06)] border border-[rgba(var(--border),var(--border-opacity))]">
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
                  className={`w-8 h-8 rounded-[var(--radius-sm)] border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center ${
                    selectedHighlight === ''
                      ? 'border-[rgb(var(--accent))] bg-[rgba(var(--accent),0.1)]'
                      : 'border-[rgba(var(--border),var(--border-opacity))] bg-surface'
                  }`}
                >
                  <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Tooltip>
              {HIGHLIGHT_COLORS.map((color) => (
                <Tooltip key={color.name} content={color.name} position="top">
                  <button
                    onClick={() => setSelectedHighlight(color.value)}
                    className={`w-8 h-8 rounded-[var(--radius-sm)] border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center text-xs ${
                      selectedHighlight === color.value ? 'border-[rgb(var(--accent))] scale-105' : ''
                    }`}
                    style={{
                      backgroundColor: color.value,
                      borderColor: selectedHighlight === color.value ? 'rgb(var(--accent))' : color.border,
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
            <label className="block text-sm font-medium text-foreground mb-2">
              Your note:
            </label>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write your thoughts about this passage..."
              className="w-full h-32 p-3 text-sm border border-[rgba(var(--border),var(--border-opacity))] rounded-[var(--radius)] bg-surface text-foreground placeholder-muted resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))] transition-all duration-200"
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
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!note.trim()}
              className="btn-primary"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}