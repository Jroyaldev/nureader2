"use client";

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface NoteMobileModalProps {
  visible: boolean;
  selectedText: string;
  onSave: (note: string) => void;
  onClose: () => void;
  existingNote?: string;
}

export default function NoteMobileModal({
  visible,
  selectedText,
  onSave,
  onClose,
  existingNote = ''
}: NoteMobileModalProps) {
  const [note, setNote] = useState(existingNote);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNote(existingNote);
  }, [existingNote]);

  useEffect(() => {
    if (visible) {
      // Focus textarea when visible with delay for animation
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
  }, [visible]);

  const handleSave = () => {
    if (note.trim()) {
      onSave(note.trim());
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal - Full screen on mobile */}
      <div className="absolute inset-x-0 bottom-0 animate-in slide-in-from-bottom duration-300">
        <div className="bg-background rounded-t-2xl max-h-[85vh] flex flex-col">
          {/* Handle bar */}
          <div className="flex justify-center py-2">
            <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 border-b border-border/30">
            <h3 className="text-lg font-semibold text-foreground">Add Note</h3>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg hover:bg-muted/10 active:bg-muted/20 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Selected text preview */}
            {selectedText && (
              <div className="px-5 py-4 border-b border-border/30">
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Selected Text</p>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-sm text-foreground/80 italic">
                    "{selectedText}"
                  </p>
                </div>
              </div>
            )}
            
            {/* Note input */}
            <div className="px-5 py-4">
              <label className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide block">
                Your Note
              </label>
              <textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type your note here..."
                className="w-full h-40 px-4 py-3 text-base bg-muted/30 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted-foreground/50"
                autoFocus
              />
            </div>
          </div>
          
          {/* Footer with actions - Safe area padding for mobile */}
          <div className="border-t border-border/30 px-5 py-4 pb-safe">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 text-sm font-medium text-muted-foreground bg-muted/10 hover:bg-muted/20 active:bg-muted/30 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!note.trim()}
                className="flex-1 px-4 py-3 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 active:bg-accent/80 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckIcon className="w-4 h-4" />
                Save Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}