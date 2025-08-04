"use client";

import React, { useState, useEffect, useRef } from 'react';
import Tooltip from './Tooltip';

interface AnnotationToolbarProps {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedText: string;
  onHighlight: (color: string) => void;
  onNote: () => void;
  onBookmark: () => void;
  onClose: () => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'rgba(254, 243, 199, 0.5)', border: 'rgba(245, 158, 11, 0.8)' },
  { name: 'Green', value: 'rgba(209, 250, 229, 0.5)', border: 'rgba(16, 185, 129, 0.8)' },
  { name: 'Blue', value: 'rgba(219, 234, 254, 0.5)', border: 'rgba(59, 130, 246, 0.8)' },
  { name: 'Pink', value: 'rgba(252, 231, 243, 0.5)', border: 'rgba(236, 72, 153, 0.8)' },
  { name: 'Purple', value: 'rgba(233, 213, 255, 0.5)', border: 'rgba(139, 92, 246, 0.8)' },
];

export default function AnnotationToolbar({
  isVisible,
  position,
  selectedText,
  onHighlight,
  onNote,
  onBookmark,
  onClose
}: AnnotationToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) {
      setShowColorPicker(false);
    }
  }, [isVisible]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleColorSelect = (color: string) => {
    onHighlight(color);
    setShowColorPicker(false);
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[10000] animate-scale-in flex flex-col items-center"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 60}px`, // Adjust this value to position toolbar above selection
        transform: 'translateX(-50%)',
      }}
    >
      {/* Main Toolbar */}
      <div className="floating rounded-[var(--radius)] p-1.5">
        <div className="flex items-center gap-1">
          {/* Highlight Button */}
          <div className="relative">
            <Tooltip content="Highlight text" position="top">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="btn-icon"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" />
                </svg>
              </button>
            </Tooltip>
            
            {/* Color Picker Dropdown */}
            {showColorPicker && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[10001]">
                <div className="floating rounded-[var(--radius-sm)] p-2">
                  <div className="flex gap-1.5">
                    {HIGHLIGHT_COLORS.map((color) => (
                      <Tooltip key={color.name} content={color.name} position="top">
                        <button
                          onClick={() => handleColorSelect(color.value)}
                          className="w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110"
                          style={{
                            backgroundColor: color.value,
                            borderColor: color.border,
                          }}
                        />
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-[rgba(var(--border),var(--border-opacity))]" />

          {/* Note Button */}
          <Tooltip content="Add note" position="top">
            <button onClick={onNote} className="btn-icon">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </Tooltip>

          {/* Bookmark Button */}
          <Tooltip content="Add bookmark" position="top">
            <button onClick={onBookmark} className="btn-icon">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </Tooltip>

          <div className="w-px h-5 bg-[rgba(var(--border),var(--border-opacity))]" />

          {/* Close Button */}
          <Tooltip content="Close" position="top">
            <button onClick={onClose} className="btn-icon">
              <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Arrow pointing to selection */}
      <div
        className="w-3 h-3 rotate-45 -mt-1.5"
        style={{ background: 'rgb(var(--surface))', borderRight: 'var(--space-hairline) solid rgba(var(--border), var(--border-opacity))', borderBottom: 'var(--space-hairline) solid rgba(var(--border), var(--border-opacity))' }}
      />
    </div>
  );
}