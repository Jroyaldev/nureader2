"use client";

import {
  XMarkIcon,
  ArrowPathIcon,
  AdjustmentsVerticalIcon,
  PaintBrushIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';

export interface SimplifiedReadingSettings {
  // Typography
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'justify';
  
  // Layout
  marginHorizontal: number;
  marginVertical: number;
  maxWidth: number;
  
  // Theme & Display
  theme: 'light' | 'dark' | 'sepia' | 'night';
  brightness: number;
  contrast: number;
  
  // Behavior
  autoHideToolbar: boolean;
  readingSpeed: number; // words per minute
}

interface EnhancedSettingsPanelProps {
  visible: boolean;
  settings: SimplifiedReadingSettings;
  onSettingsChange: (settings: Partial<SimplifiedReadingSettings>) => void;
  onClose: () => void;
  onReset: () => void;
  isMobile?: boolean;
}

const FONT_FAMILIES = [
  { value: 'system-ui', name: 'System', preview: 'Aa' },
  { value: 'Georgia, serif', name: 'Georgia', preview: 'Aa' },
  { value: "'Charter', 'Georgia', serif", name: 'Charter', preview: 'Aa' },
  { value: "'Inter', sans-serif", name: 'Inter', preview: 'Aa' },
  { value: "'Atkinson Hyperlegible', sans-serif", name: 'Readable', preview: 'Aa' },
  { value: "'JetBrains Mono', monospace", name: 'Mono', preview: 'Aa' }
];

// Theme selection removed - now handled in toolbar only

const QUICK_PRESETS = [
  {
    name: 'Comfortable',
    icon: '🛋️',
    settings: {
      fontSize: 18,
      lineHeight: 1.8,
      marginHorizontal: 60
    }
  },
  {
    name: 'Compact', 
    icon: '📱',
    settings: {
      fontSize: 14,
      lineHeight: 1.5,
      marginHorizontal: 20
    }
  },
  {
    name: 'Focus',
    icon: '🎯',
    settings: {
      fontSize: 20,
      lineHeight: 2.0,
      marginHorizontal: 80,
      maxWidth: 600
    }
  }
];

export const EnhancedSettingsPanel: React.FC<EnhancedSettingsPanelProps> = ({
  visible,
  settings,
  onSettingsChange,
  onClose,
  onReset,
  isMobile = false
}) => {
  const [activeTab, setActiveTab] = useState<'display' | 'reading'>('display');
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('readerSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setLocalSettings(parsed);
        onSettingsChange(parsed);
      } catch (e) {
        console.error('Failed to load saved settings:', e);
      }
    }
  }, []);
  
  // Save to localStorage when settings change
  useEffect(() => {
    if (hasChanges) {
      localStorage.setItem('readerSettings', JSON.stringify(localSettings));
      const timeout = setTimeout(() => setHasChanges(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [localSettings, hasChanges]);

  // Prevent body scroll on mobile when panel is open
  useEffect(() => {
    if (isMobile && visible) {
      // Store original overflow and position
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore body scroll
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobile, visible]);
  
  const handleSliderChange = (key: keyof SimplifiedReadingSettings, value: number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    onSettingsChange({ [key]: value });
    setHasChanges(true);
  };
  
  const handleSelectChange = (key: keyof SimplifiedReadingSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    onSettingsChange({ [key]: value });
    setHasChanges(true);
  };
  
  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    const newSettings = { ...localSettings, ...preset.settings };
    setLocalSettings(newSettings);
    onSettingsChange(preset.settings);
    setHasChanges(true);
  };
  
  const handleReset = () => {
    onReset();
    localStorage.removeItem('readerSettings');
    setHasChanges(false);
  };
  
  if (isMobile) {
    return (
      <div className={`
        fixed inset-0 z-[90] transition-all duration-500
        ${visible ? 'visible' : 'invisible'}
      `}>
        {/* Enhanced Backdrop - Matches TableOfContents */}
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-500 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        
        {/* Enhanced Bottom Sheet with Glassmorphism - Matches TableOfContents */}
        <div className={`
          absolute bottom-0 left-0 right-0 
          glass-primary backdrop-blur-xl
          border border-white/20 dark:border-gray-700/30
          shadow-2xl shadow-black/20
          rounded-t-3xl transition-all duration-500 ease-out 
          max-h-[85vh] flex flex-col
          ${visible ? 'translate-y-0' : 'translate-y-full'}
          safe-area-pb
        `}>
          {/* Enhanced Handle */}
          <div className="flex justify-center pt-4 pb-3">
            <div className="w-12 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded-full" />
          </div>
          
          {/* Enhanced Header */}
          <div className="px-6 pb-4 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(var(--muted),0.1)] dark:bg-[rgba(255,255,255,0.05)] flex items-center justify-center backdrop-blur-sm shadow-md">
                  <AdjustmentsVerticalIcon className="w-5 h-5 text-[rgb(var(--accent))]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reading Settings</h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Customize your reading experience</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 -mr-2 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all duration-200 backdrop-blur-sm"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Enhanced Quick Presets */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-700/30 rounded-xl backdrop-blur-sm border border-gray-200/20 dark:border-gray-700/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[rgb(var(--accent))]" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick customize</span>
              </div>
              {hasChanges && (
                <div className="flex items-center gap-2">
                  <div className="text-xs px-2 py-1 bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] rounded-full font-medium">
                    Auto-saved
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Tabs */}
          <div className="flex border-b border-black/10 dark:border-white/10">
            {(['display', 'reading'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all relative touch-manipulation font-inter ${
                  activeTab === tab
                    ? 'text-[#228b22]'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {tab === 'display' ? (
                  <PaintBrushIcon className="w-4 h-4" />
                ) : (
                  <DocumentTextIcon className="w-4 h-4" />
                )}
                <span className="capitalize">{tab}</span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#228b22] rounded-full" />
                )}
              </button>
            ))}
          </div>
          
          {/* Enhanced Content */}
          <div 
            className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-gray-300/50 dark:scrollbar-thumb-gray-600/50 scrollbar-track-transparent"
            style={{
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {activeTab === 'display' && (
              <>
                {/* Quick Presets */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground font-inter">Quick Presets</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className="group relative p-3 rounded-xl bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 hover:bg-white/70 dark:hover:bg-black/70 transition-all active:scale-95 touch-manipulation font-inter"
                      >
                        <div className="text-lg mb-1">{preset.icon}</div>
                        <span className="text-xs font-medium text-foreground font-inter">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Font Size */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground font-inter">Font Size</label>
                    <span className="text-sm font-mono bg-white/50 dark:bg-black/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
                      {localSettings.fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="28"
                    value={localSettings.fontSize}
                    onChange={(e) => handleSliderChange('fontSize', Number(e.target.value))}
                    className="w-full h-2 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#228b22] [&::-webkit-slider-thumb]:cursor-pointer
                             [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                             [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full 
                             [&::-moz-range-thumb]:bg-[#228b22] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                             focus:outline-none focus:ring-2 focus:ring-[#228b22]/20"
                  />
                </div>
                
                {/* Font Family */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground font-inter">Font Family</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FONT_FAMILIES.map((font) => (
                      <button
                        key={font.value}
                        onClick={() => handleSelectChange('fontFamily', font.value)}
                        className={`p-3 rounded-xl border transition-all active:scale-95 touch-manipulation font-inter ${
                          localSettings.fontFamily === font.value
                            ? 'border-[#228b22] bg-[#228b22]/10 backdrop-blur-sm'
                            : 'border-white/30 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-gray-800/70'
                        }`}
                      >
                        <div className="text-lg mb-1" style={{ fontFamily: font.value }}>
                          {font.preview}
                        </div>
                        <div className="text-xs text-muted font-inter">
                          {font.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'reading' && (
              <>
                {/* Line Height */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground font-inter">Line Spacing</label>
                    <span className="text-sm font-mono bg-white/50 dark:bg-black/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
                      {localSettings.lineHeight.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="2.5"
                    step="0.1"
                    value={localSettings.lineHeight}
                    onChange={(e) => handleSliderChange('lineHeight', Number(e.target.value))}
                    className="w-full h-2 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#228b22] [&::-webkit-slider-thumb]:cursor-pointer
                             [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                             [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full 
                             [&::-moz-range-thumb]:bg-[#228b22] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                             focus:outline-none focus:ring-2 focus:ring-[#228b22]/20"
                  />
                </div>
                
                {/* Text Alignment */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground font-inter">Text Alignment</label>
                  <div className="flex gap-2">
                    {(['left', 'justify'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => handleSelectChange('textAlign', align)}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 touch-manipulation font-inter ${
                          localSettings.textAlign === align
                            ? 'bg-[#228b22] text-white shadow-md backdrop-blur-sm'
                            : 'bg-white/50 dark:bg-black/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-black/70 text-foreground'
                        }`}
                      >
                        {align === 'left' ? 'Left' : 'Justified'}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Margins */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground font-inter">Side Margins</label>
                    <span className="text-sm font-mono bg-white/50 dark:bg-black/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
                      {localSettings.marginHorizontal}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={localSettings.marginHorizontal}
                    onChange={(e) => handleSliderChange('marginHorizontal', Number(e.target.value))}
                    className="w-full h-2 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#228b22] [&::-webkit-slider-thumb]:cursor-pointer
                             [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                             [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full 
                             [&::-moz-range-thumb]:bg-[#228b22] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                             focus:outline-none focus:ring-2 focus:ring-[#228b22]/20"
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Mobile Footer */}
          <div className="px-6 py-4 border-t border-black/10 dark:border-white/10 safe-area-pb font-inter">
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-black/70 text-foreground text-sm font-medium transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2 font-inter"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#228b22]/90 backdrop-blur-sm hover:bg-[#228b22] text-white text-sm font-medium transition-all active:scale-95 touch-manipulation font-inter"
              >
                Done
              </button>
            </div>
            <div className="space-y-1 pb-8">
              {hasChanges && (
                <div className="flex items-center justify-center gap-2 text-xs text-[#228b22] mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#228b22] animate-pulse" />
                  <span>Settings saved automatically</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`
      fixed right-6 top-1/2 -translate-y-1/2 z-[85] w-[380px] h-[min(700px,90vh)]
      transition-all duration-500 ${visible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}
    `}>
      {/* Enhanced glass panel matching TOC/Annotations style */}
      <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-black/10 dark:border-white/20 rounded-2xl flex flex-col h-full font-inter shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(var(--muted),0.1)] dark:bg-[rgba(255,255,255,0.05)] backdrop-blur-sm flex items-center justify-center shadow-md">
                <AdjustmentsVerticalIcon className="w-5 h-5 text-[#228b22]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground tracking-tight font-inter">Reading Settings</h2>
                <p className="text-xs text-muted font-medium font-inter">
                  {hasChanges ? 'Saving...' : 'Customize your experience'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 backdrop-blur-sm transition-all active:scale-95 touch-manipulation font-inter"
                aria-label="Reset to defaults"
                title="Reset to defaults"
              >
                <ArrowPathIcon className="w-4 h-4 text-muted" />
              </button>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 backdrop-blur-sm transition-all active:scale-95 touch-manipulation font-inter"
                aria-label="Close"
              >
                <XMarkIcon className="w-4 h-4 text-muted" />
              </button>
            </div>
          </div>
          
          {/* Quick Presets - Enhanced */}
          <div className="px-4 pb-4">
            <div className="flex gap-2">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="flex-1 group relative overflow-hidden rounded-xl bg-white/30 dark:bg-white/10 backdrop-blur-sm hover:bg-white/50 dark:hover:bg-white/20 transition-all duration-300 p-3 active:scale-95 touch-manipulation font-inter"
                >
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-xs font-medium text-muted group-hover:text-foreground transition-colors font-inter">
                      {preset.name}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#228b22]/0 to-[#228b22]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Tabs - Enhanced */}
        <div className="shrink-0 px-6 pb-4">
          <div className="flex bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-xl p-1">
            {(['display', 'reading'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 active:scale-95 touch-manipulation font-inter ${
                  activeTab === tab
                    ? 'bg-white/90 dark:bg-black/90 text-foreground shadow-lg backdrop-blur-md'
                    : 'text-muted hover:text-foreground hover:bg-white/30 dark:hover:bg-white/10'
                }`}
              >
                {tab === 'display' ? 'Display' : 'Reading'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Settings Content - Enhanced with better spacing and visuals */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="p-6 space-y-6">
            {activeTab === 'display' && (
              <>
                {/* Font Size - Enhanced Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground font-inter">Font Size</label>
                    <span className="text-sm font-mono bg-white/50 dark:bg-black/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
                      {localSettings.fontSize}px
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="12"
                      max="28"
                      value={localSettings.fontSize}
                      onChange={(e) => handleSliderChange('fontSize', Number(e.target.value))}
                      className="w-full h-2 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#228b22] [&::-webkit-slider-thumb]:cursor-pointer
                               [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                               [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full 
                               [&::-moz-range-thumb]:bg-[#228b22] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                               focus:outline-none focus:ring-2 focus:ring-[#228b22]/20"
                      style={{
                        background: `linear-gradient(to right, #228b22 0%, #228b22 ${((localSettings.fontSize - 12) / 16) * 100}%, rgba(var(--muted), 0.2) ${((localSettings.fontSize - 12) / 16) * 100}%, rgba(var(--muted), 0.2) 100%)`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted font-inter">
                    <span>A</span>
                    <span className="text-base">A</span>
                    <span className="text-xl">A</span>
                  </div>
                </div>
                
                {/* Font Family - Enhanced Grid */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block font-inter">Font Family</label>
                  <div className="grid grid-cols-3 gap-2">
                    {FONT_FAMILIES.map((font) => (
                      <button
                        key={font.value}
                        onClick={() => handleSelectChange('fontFamily', font.value)}
                        className={`group relative p-3 rounded-xl border transition-all duration-300 active:scale-95 touch-manipulation ${
                          localSettings.fontFamily === font.value
                            ? 'border-[#228b22] bg-[#228b22]/10 backdrop-blur-sm'
                            : 'border-white/30 dark:border-white/20 bg-white/50 dark:bg-black/50 backdrop-blur-sm hover:border-[#228b22]/50 hover:bg-[#228b22]/10'
                        }`}
                      >
                        <div className="text-2xl leading-none mb-2" style={{ fontFamily: font.value }}>
                          {font.preview}
                        </div>
                        <div className="text-[10px] text-muted group-hover:text-foreground transition-colors font-inter">
                          {font.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Display Adjustments - Grouped */}
                <div className="space-y-4 p-4 rounded-xl bg-white/20 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider font-inter">Display Adjustments</h3>
                  
                  {/* Brightness */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-muted font-inter">Brightness</label>
                      <span className="text-xs font-mono text-muted font-inter">{localSettings.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="120"
                      value={localSettings.brightness}
                      onChange={(e) => handleSliderChange('brightness', Number(e.target.value))}
                      className="w-full h-1.5 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#228b22] [&::-webkit-slider-thumb]:cursor-pointer
                               [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                               [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                               [&::-moz-range-thumb]:bg-[#228b22] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                               focus:outline-none focus:ring-2 focus:ring-[#228b22]/20"
                    />
                  </div>
                  
                  {/* Contrast */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-muted font-inter">Contrast</label>
                      <span className="text-xs font-mono text-muted font-inter">{localSettings.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="120"
                      value={localSettings.contrast}
                      onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
                      className="w-full h-1.5 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#228b22] [&::-webkit-slider-thumb]:cursor-pointer
                               [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                               [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                               [&::-moz-range-thumb]:bg-[#228b22] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                               focus:outline-none focus:ring-2 focus:ring-[#228b22]/20"
                    />
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'reading' && (
              <>
                {/* Typography Settings */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider font-inter">Typography</h3>
                  
                  {/* Line Height */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground font-inter">Line Spacing</label>
                      <span className="text-sm font-mono bg-white/50 dark:bg-black/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
                        {localSettings.lineHeight.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.2"
                      max="2.5"
                      step="0.1"
                      value={localSettings.lineHeight}
                      onChange={(e) => handleSliderChange('lineHeight', Number(e.target.value))}
                      className="w-full h-2 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#228b22] [&::-webkit-slider-thumb]:cursor-pointer
                             [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                             [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full 
                             [&::-moz-range-thumb]:bg-[#228b22] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                             focus:outline-none focus:ring-2 focus:ring-[#228b22]/20"
                    />
                    <div className="flex justify-between text-xs text-muted font-inter">
                      <span>Tight</span>
                      <span>Comfortable</span>
                      <span>Loose</span>
                    </div>
                  </div>
                  
                  {/* Letter Spacing */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground font-inter">Letter Spacing</label>
                      <span className="text-sm font-mono bg-white/50 dark:bg-black/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
                        {localSettings.letterSpacing.toFixed(1)}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-0.5"
                      max="2"
                      step="0.1"
                      value={localSettings.letterSpacing}
                      onChange={(e) => handleSliderChange('letterSpacing', Number(e.target.value))}
                      className="w-full h-2 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#228b22] [&::-webkit-slider-thumb]:cursor-pointer
                             [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                             [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full 
                             [&::-moz-range-thumb]:bg-[#228b22] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                             focus:outline-none focus:ring-2 focus:ring-[#228b22]/20"
                    />
                  </div>
                  
                  {/* Text Alignment */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block font-inter">Text Alignment</label>
                    <div className="flex gap-2">
                      {(['left', 'justify'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => handleSelectChange('textAlign', align)}
                          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 touch-manipulation font-inter ${
                            localSettings.textAlign === align
                              ? 'bg-[#228b22] text-white shadow-md backdrop-blur-sm'
                              : 'bg-white/50 dark:bg-black/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-black/70 text-foreground'
                          }`}
                        >
                          {align === 'left' ? 'Left' : 'Justified'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Layout Settings */}
                <div className="space-y-4 p-4 rounded-xl bg-white/20 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider font-inter">Layout</h3>
                  
                  {/* Side Margins */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-muted font-inter">Side Margins</label>
                      <span className="text-xs font-mono text-muted font-inter">{localSettings.marginHorizontal}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      value={localSettings.marginHorizontal}
                      onChange={(e) => handleSliderChange('marginHorizontal', Number(e.target.value))}
                      className="w-full h-1.5 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#228b22] [&::-webkit-slider-thumb]:cursor-pointer
                               [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                               [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                               [&::-moz-range-thumb]:bg-[#228b22] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                               focus:outline-none focus:ring-2 focus:ring-[#228b22]/20"
                    />
                  </div>
                  
                  {/* Content Width */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-muted font-inter">Max Width</label>
                      <span className="text-xs font-mono text-muted font-inter">
                        {localSettings.maxWidth === 0 ? 'Full' : `${localSettings.maxWidth}px`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="50"
                      value={localSettings.maxWidth}
                      onChange={(e) => handleSliderChange('maxWidth', Number(e.target.value))}
                      className="w-full h-1.5 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#228b22] [&::-webkit-slider-thumb]:cursor-pointer
                               [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                               [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                               [&::-moz-range-thumb]:bg-[#228b22] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                               focus:outline-none focus:ring-2 focus:ring-[#228b22]/20"
                    />
                  </div>
                </div>
                
                {/* Behavior Settings */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider font-inter">Behavior</h3>
                  
                  {/* Reading Speed */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground font-inter">Reading Speed</label>
                      <span className="text-sm font-mono bg-white/50 dark:bg-black/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
                        {localSettings.readingSpeed} WPM
                      </span>
                    </div>
                    <input
                      type="range"
                      min="150"
                      max="400"
                      step="10"
                      value={localSettings.readingSpeed}
                      onChange={(e) => handleSliderChange('readingSpeed', Number(e.target.value))}
                      className="w-full h-2 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#228b22] [&::-webkit-slider-thumb]:cursor-pointer
                             [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                             [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full 
                             [&::-moz-range-thumb]:bg-[#228b22] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                             focus:outline-none focus:ring-2 focus:ring-[#228b22]/20"
                    />
                    <p className="text-xs text-muted font-inter">Affects time remaining estimates</p>
                  </div>
                  
                  {/* Auto-hide Toolbar */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/20 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10">
                    <div>
                      <label className="text-sm font-medium text-foreground font-inter">Auto-hide Toolbar</label>
                      <p className="text-xs text-muted mt-0.5 font-inter">Hide toolbar when reading</p>
                    </div>
                    <button
                      onClick={() => handleSelectChange('autoHideToolbar', !localSettings.autoHideToolbar)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                        localSettings.autoHideToolbar 
                          ? 'bg-[#228b22]' 
                          : 'bg-white/30 dark:bg-white/20'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${
                        localSettings.autoHideToolbar ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Footer Status */}
        {hasChanges && (
          <div className="shrink-0 px-4 py-2 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2 text-xs text-[#228b22] font-inter">
              <div className="w-1.5 h-1.5 rounded-full bg-[#228b22] animate-pulse" />
              <span>Settings saved automatically</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};