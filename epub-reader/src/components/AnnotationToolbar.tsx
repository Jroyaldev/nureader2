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
  selectedText: _selectedText,
  onHighlight,
  onNote,
  onBookmark,
  onClose
}: AnnotationToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) {
      setShowColorPicker(false);
    }
  }, [isVisible]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Don't close if clicking inside toolbar or color picker
      if (
        (toolbarRef.current && toolbarRef.current.contains(target)) ||
        (colorPickerRef.current && colorPickerRef.current.contains(target))
      ) {
        return;
      }
      onClose();
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
    <>
      {/* Color Picker Dropdown - Simplified without tooltips */}
      {showColorPicker && typeof window !== 'undefined' && (
        <div 
          ref={colorPickerRef}
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${Math.max(10, position.y - 150)}px`,
            transform: 'translateX(-50%)',
            zIndex: 999999999,
            pointerEvents: 'auto',
            width: '280px',
            padding: '12px',
            backgroundColor: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#ffffff',
            border: `1px solid ${document.documentElement.classList.contains('dark') ? '#333' : '#e5e7eb'}`,
            borderRadius: '12px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3), 0 10px 20px rgba(0, 0, 0, 0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <div style={{ 
            fontSize: '12px',
            fontWeight: '500',
            marginBottom: '8px',
            paddingLeft: '4px',
            color: document.documentElement.classList.contains('dark') ? '#a1a1aa' : '#6b7280'
          }}>
            Choose highlight color
          </div>
          
          {/* Color Grid - No tooltips, just colors */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            marginBottom: '8px'
          }}>
            {HIGHLIGHT_COLORS.map((color, index) => (
              <button
                key={index}
                onClick={() => handleColorSelect(color.value)}
                title={color.name}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  border: `2px solid ${color.border}`,
                  backgroundColor: color.value,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  display: 'block'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
            ))}
          </div>
          
          {/* Quick action */}
          <div style={{ 
            paddingTop: '8px',
            marginTop: '8px',
            borderTop: `1px solid ${document.documentElement.classList.contains('dark') ? '#333' : '#e5e7eb'}`
          }}>
            <button
              onClick={() => {
                handleColorSelect(HIGHLIGHT_COLORS[0]?.value || 'rgba(254, 243, 199, 0.5)');
              }}
              style={{ 
                width: '100%',
                padding: '4px',
                fontSize: '11px',
                color: document.documentElement.classList.contains('dark') ? '#a1a1aa' : '#6b7280',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = document.documentElement.classList.contains('dark') ? '#f5f5f7' : '#1c2024'}
              onMouseLeave={(e) => e.currentTarget.style.color = document.documentElement.classList.contains('dark') ? '#a1a1aa' : '#6b7280'}
            >
              Quick highlight (Yellow)
            </button>
          </div>
        </div>
      )}
      
      {/* Main Toolbar - Without portal */}
      <div
        ref={toolbarRef}
        className="fixed flex flex-col items-center"
        style={{
          left: `${position.x}px`,
          top: `${Math.max(10, position.y - 50)}px`,
          transform: 'translateX(-50%)',
          zIndex: 100000
        }}
      >
        <div className="rounded-lg p-1.5"
             style={{
               backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
               backdropFilter: 'blur(20px)',
               border: `1px solid ${document.documentElement.classList.contains('dark') ? '#333' : '#e5e7eb'}`,
               boxShadow: '0 8px 40px rgba(0, 0, 0, 0.12)'
             }}>
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
    </>
  );
}
