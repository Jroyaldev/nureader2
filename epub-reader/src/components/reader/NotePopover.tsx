"use client";

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface NotePopoverProps {
  visible: boolean;
  position: { x: number; y: number };
  selectedText: string;
  onSave: (note: string) => void;
  onClose: () => void;
  existingNote?: string;
}

export default function NotePopover({
  visible,
  position,
  selectedText,
  onSave,
  onClose,
  existingNote = ''
}: NotePopoverProps) {
  const [note, setNote] = useState(existingNote);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNote(existingNote);
  }, [existingNote]);

  useEffect(() => {
    if (visible && popoverRef.current) {
      // Position popover near selection
      const popover = popoverRef.current;
      const rect = popover.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let adjustedX = position.x - rect.width / 2;
      let adjustedY = position.y + 20; // Show below selection
      
      // Keep within viewport bounds
      if (adjustedX < 20) adjustedX = 20;
      if (adjustedX + rect.width > viewportWidth - 20) {
        adjustedX = viewportWidth - rect.width - 20;
      }
      if (adjustedY + rect.height > viewportHeight - 20) {
        adjustedY = position.y - rect.height - 20; // Show above if no room below
      }
      
      popover.style.left = `${adjustedX}px`;
      popover.style.top = `${adjustedY}px`;
      
      // Focus textarea when visible
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [visible, position]);

  const handleSave = () => {
    if (note.trim()) {
      onSave(note.trim());
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100]" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Popover */}
      <div
        ref={popoverRef}
        className="fixed z-[101] w-[400px] max-w-[calc(100vw-40px)] animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={{ left: position.x, top: position.y }}
      >
        <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <h3 className="text-sm font-semibold text-foreground">Add Note</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-muted/10 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          {/* Selected text preview */}
          {selectedText && (
            <div className="px-4 py-3 border-b border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
              <p className="text-sm text-foreground/80 italic line-clamp-3">
                "{selectedText}"
              </p>
            </div>
          )}
          
          {/* Note input */}
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your note here..."
              className="w-full h-32 px-3 py-2 text-sm bg-muted/30 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted-foreground/50"
              autoFocus
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 text-xs bg-muted/40 rounded">Ctrl+Enter</kbd> to save
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!note.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}