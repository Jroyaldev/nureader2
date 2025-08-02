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
  { name: 'Yellow', value: '#fef3c7', border: '#f59e0b', icon: '🟡' },
  { name: 'Green', value: '#d1fae5', border: '#10b981', icon: '🟢' },
  { name: 'Blue', value: '#dbeafe', border: '#3b82f6', icon: '🔵' },
  { name: 'Pink', value: '#fce7f3', border: '#ec4899', icon: '🩷' },
  { name: 'Purple', value: '#e9d5ff', border: '#8b5cf6', icon: '🟣' },
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

  // Debug logging
  console.log('AnnotationToolbar render:', { isVisible, position, selectedText });
  
  if (!isVisible) return null;

  const handleColorSelect = (color: string) => {
    onHighlight(color);
    setShowColorPicker(false);
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[10000] animate-scale-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 60}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Main Toolbar */}
      <div className="floating-premium rounded-xl px-3 py-2 shadow-2xl">
        <div className="flex items-center gap-1">
          {/* Highlight Button */}
          <div className="relative">
            <Tooltip content="Highlight text" position="top">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="control-btn annotation-btn"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7H3a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
                </svg>
              </button>
            </Tooltip>
            
            {/* Color Picker Dropdown */}
            {showColorPicker && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[10001]">
                <div className="floating-premium rounded-lg p-2 min-w-[140px]">
                  <div className="text-xs font-medium text-muted mb-2 text-center">Choose color</div>
                  <div className="flex gap-1">
                    {HIGHLIGHT_COLORS.map((color) => (
                      <Tooltip key={color.name} content={color.name} position="top">
                        <button
                          onClick={() => handleColorSelect(color.value)}
                          className="w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center text-xs"
                          style={{
                            backgroundColor: color.value,
                            borderColor: color.border,
                          }}
                        >
                          {color.icon}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Note Button */}
          <Tooltip content="Add note" position="top">
            <button
              onClick={onNote}
              className="control-btn annotation-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </Tooltip>

          {/* Bookmark Button */}
          <Tooltip content="Add bookmark" position="top">
            <button
              onClick={onBookmark}
              className="control-btn annotation-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </Tooltip>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Close Button */}
          <Tooltip content="Close" position="top">
            <button
              onClick={onClose}
              className="control-btn annotation-btn text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Selected Text Preview */}
      {selectedText && (
        <div className="mt-2 max-w-xs">
          <div className="floating-premium rounded-lg px-3 py-2 text-xs">
            <div className="text-muted mb-1">Selected text:</div>
            <div className="line-clamp-2 text-foreground font-medium italic">
              "{selectedText}"
            </div>
          </div>
        </div>
      )}

      {/* Arrow pointing to selection */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-gray-800 dark:border-t-gray-200" />
    </div>
  );
}