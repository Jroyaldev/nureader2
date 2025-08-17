"use client";

import React from 'react';
import { getGlassClasses, getReaderClasses, validateThemeCompatibility } from '@/utils/theme';

/**
 * Theme Test Component - Demonstrates the new semantic color system
 * This shows how components should use the new theme-aware classes
 */
export const ThemeTest = () => {
  const readerClasses = getReaderClasses();
  
  // Validate our classes for demo
  validateThemeCompatibility('ThemeTest', 'surface-glass-medium');
  
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-primary">Theme System Test</h2>
      
      {/* Glass Effects Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Glass Effects</h3>
        <div className={`p-4 ${getGlassClasses('low')} rounded-xl`}>
          <p className="text-primary">Low opacity glass - replaces bg-white/80</p>
        </div>
        <div className={`p-4 ${getGlassClasses('medium')} rounded-xl`}>
          <p className="text-primary">Medium opacity glass - replaces bg-white/90</p>
        </div>
        <div className={`p-4 ${getGlassClasses('high')} rounded-xl`}>
          <p className="text-primary">High opacity glass - replaces bg-white/95</p>
        </div>
      </div>
      
      {/* Text Hierarchy Demo */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-primary">Text Hierarchy</h3>
        <p className="text-primary">Primary text - main content</p>
        <p className="text-secondary">Secondary text - descriptions</p>
        <p className="text-tertiary">Tertiary text - subtle labels</p>
      </div>
      
      {/* Interactive Elements Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Interactive Elements</h3>
        <button className="reader-btn px-4 py-2 rounded-lg">
          Reader Button (hover me)
        </button>
        <div className="p-4 interactive-hover rounded-lg cursor-pointer">
          Interactive Hover Area
        </div>
      </div>
      
      {/* Reader Components Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Reader Components</h3>
        <div className="w-80 h-40">
          <div className={`${readerClasses.floating} h-full p-4`}>
            <p className="text-primary">Floating Reader Panel</p>
            <p className="text-secondary">Uses the same pattern as TOC</p>
          </div>
        </div>
      </div>
      
      {/* Mobile Toolbar Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Mobile Toolbar</h3>
        <div className={`${readerClasses.mobileToolbar} p-4 rounded-lg`}>
          <div className="flex items-center justify-between">
            <button className="mobile-btn">
              <span>📖</span>
            </button>
            <span className="text-primary">Mobile Toolbar</span>
            <button className="mobile-btn">
              <span>⚙️</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Migration Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Before/After Migration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-secondary mb-2">❌ Old Pattern</h4>
            <code className="text-xs bg-red-100 dark:bg-red-900/20 p-2 rounded">
              bg-white/90 dark:bg-black/90
            </code>
          </div>
          <div>
            <h4 className="text-sm font-medium text-secondary mb-2">✅ New Pattern</h4>
            <code className="text-xs bg-green-100 dark:bg-green-900/20 p-2 rounded">
              surface-glass-medium
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};