"use client";

import {
  XMarkIcon,
  ArrowPathIcon,
  AdjustmentsVerticalIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
  BookOpenIcon,
  CheckIcon,
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
  onReset
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
  
  return (
    <div className={`
      fixed right-6 top-1/2 -translate-y-1/2 z-[85] w-[380px] h-[min(700px,90vh)]
      transition-all duration-500 ${visible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}
    `}>
      {/* Enhanced glass panel matching TOC/Annotations style */}
      <div className="reader-floating no-top-glint rounded-2xl flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgb(var(--accent))]/20 to-[rgb(var(--accent))]/10 flex items-center justify-center">
                <AdjustmentsVerticalIcon className="w-5 h-5 text-[rgb(var(--accent))]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground tracking-tight">Reading Settings</h2>
                <p className="text-xs text-muted font-medium">
                  {hasChanges ? 'Saving...' : 'Customize your experience'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-2 rounded-lg hover:bg-[rgba(var(--muted),0.1)] transition-colors"
                aria-label="Reset to defaults"
                title="Reset to defaults"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg hover:bg-[rgba(var(--muted),0.1)] transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-4 h-4" />
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
                  className="flex-1 group relative overflow-hidden rounded-xl bg-[rgba(var(--muted),0.05)] hover:bg-[rgba(var(--muted),0.1)] transition-all duration-300 p-3"
                >
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      {preset.name}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent))]/0 to-[rgb(var(--accent))]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Tabs - Enhanced */}
        <div className="shrink-0 flex border-b border-black/5 dark:border-white/5">
          {(['display', 'reading'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all relative ${
                activeTab === tab
                  ? 'text-[rgb(var(--accent))]'
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
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-[rgb(var(--accent))] rounded-full" />
              )}
            </button>
          ))}
        </div>
        
        {/* Settings Content - Enhanced with better spacing and visuals */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {activeTab === 'display' && (
              <>
                {/* Font Size - Enhanced Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Font Size</label>
                    <span className="text-sm font-mono bg-[rgba(var(--muted),0.1)] px-2 py-1 rounded">
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
                      className="w-full h-2 bg-[rgba(var(--muted),0.1)] rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, rgb(var(--accent)) 0%, rgb(var(--accent)) ${((localSettings.fontSize - 12) / 16) * 100}%, rgba(var(--muted),0.1) ${((localSettings.fontSize - 12) / 16) * 100}%, rgba(var(--muted),0.1) 100%)`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>A</span>
                    <span className="text-base">A</span>
                    <span className="text-xl">A</span>
                  </div>
                </div>
                
                {/* Font Family - Enhanced Grid */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">Font Family</label>
                  <div className="grid grid-cols-3 gap-2">
                    {FONT_FAMILIES.map((font) => (
                      <button
                        key={font.value}
                        onClick={() => handleSelectChange('fontFamily', font.value)}
                        className={`group relative p-3 rounded-xl border transition-all duration-300 ${
                          localSettings.fontFamily === font.value
                            ? 'border-[rgb(var(--accent))] bg-[rgba(var(--accent),0.05)]'
                            : 'border-[rgba(var(--border),0.1)] hover:border-[rgba(var(--accent),0.3)] hover:bg-[rgba(var(--muted),0.05)]'
                        }`}
                      >
                        <div className="text-2xl leading-none mb-2" style={{ fontFamily: font.value }}>
                          {font.preview}
                        </div>
                        <div className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                          {font.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Display Adjustments - Grouped */}
                <div className="space-y-4 p-4 rounded-xl bg-[rgba(var(--muted),0.03)] border border-[rgba(var(--border),0.05)]">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Display Adjustments</h3>
                  
                  {/* Brightness */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-muted-foreground">Brightness</label>
                      <span className="text-xs font-mono text-muted">{localSettings.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="120"
                      value={localSettings.brightness}
                      onChange={(e) => handleSliderChange('brightness', Number(e.target.value))}
                      className="w-full h-1.5 bg-[rgba(var(--muted),0.2)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Contrast */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-muted-foreground">Contrast</label>
                      <span className="text-xs font-mono text-muted">{localSettings.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="120"
                      value={localSettings.contrast}
                      onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
                      className="w-full h-1.5 bg-[rgba(var(--muted),0.2)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'reading' && (
              <>
                {/* Typography Settings */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Typography</h3>
                  
                  {/* Line Height */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Line Spacing</label>
                      <span className="text-sm font-mono bg-[rgba(var(--muted),0.1)] px-2 py-1 rounded">
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
                      className="w-full h-2 bg-[rgba(var(--muted),0.1)] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted">
                      <span>Tight</span>
                      <span>Comfortable</span>
                      <span>Loose</span>
                    </div>
                  </div>
                  
                  {/* Letter Spacing */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Letter Spacing</label>
                      <span className="text-sm font-mono bg-[rgba(var(--muted),0.1)] px-2 py-1 rounded">
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
                      className="w-full h-2 bg-[rgba(var(--muted),0.1)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Text Alignment */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Text Alignment</label>
                    <div className="flex gap-2">
                      {(['left', 'justify'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => handleSelectChange('textAlign', align)}
                          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            localSettings.textAlign === align
                              ? 'bg-[rgb(var(--accent))] text-white shadow-md'
                              : 'bg-[rgba(var(--muted),0.05)] hover:bg-[rgba(var(--muted),0.1)] text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {align === 'left' ? 'Left' : 'Justified'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Layout Settings */}
                <div className="space-y-4 p-4 rounded-xl bg-[rgba(var(--muted),0.03)] border border-[rgba(var(--border),0.05)]">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Layout</h3>
                  
                  {/* Side Margins */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-muted-foreground">Side Margins</label>
                      <span className="text-xs font-mono text-muted">{localSettings.marginHorizontal}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      value={localSettings.marginHorizontal}
                      onChange={(e) => handleSliderChange('marginHorizontal', Number(e.target.value))}
                      className="w-full h-1.5 bg-[rgba(var(--muted),0.2)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Content Width */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-muted-foreground">Max Width</label>
                      <span className="text-xs font-mono text-muted">
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
                      className="w-full h-1.5 bg-[rgba(var(--muted),0.2)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
                
                {/* Behavior Settings */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Behavior</h3>
                  
                  {/* Reading Speed */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Reading Speed</label>
                      <span className="text-sm font-mono bg-[rgba(var(--muted),0.1)] px-2 py-1 rounded">
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
                      className="w-full h-2 bg-[rgba(var(--muted),0.1)] rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-muted">Affects time remaining estimates</p>
                  </div>
                  
                  {/* Auto-hide Toolbar */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(var(--muted),0.03)] border border-[rgba(var(--border),0.05)]">
                    <div>
                      <label className="text-sm font-medium text-foreground">Auto-hide Toolbar</label>
                      <p className="text-xs text-muted mt-0.5">Hide toolbar when reading</p>
                    </div>
                    <button
                      onClick={() => handleSelectChange('autoHideToolbar', !localSettings.autoHideToolbar)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                        localSettings.autoHideToolbar 
                          ? 'bg-[rgb(var(--accent))]' 
                          : 'bg-[rgba(var(--muted),0.2)]'
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
            <div className="flex items-center gap-2 text-xs text-[rgb(var(--accent))]">
              <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))] animate-pulse" />
              <span>Settings saved automatically</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};