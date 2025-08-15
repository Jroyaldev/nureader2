"use client";

import {
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  TableCellsIcon,
  DocumentTextIcon,
  AdjustmentsVerticalIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import React, { useState } from 'react';

export interface ReadingSettings {
  // Typography
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  textAlign: 'left' | 'justify' | 'center';
  hyphenation: boolean;
  
  // Layout
  marginHorizontal: number;
  marginVertical: number;
  columnCount: 1 | 2;
  columnGap: number;
  maxWidth: number;
  scrollMode: 'paginated' | 'scrolled' | 'continuous';
  
  // Theme
  theme: 'light' | 'dark' | 'sepia' | 'night';
  brightness: number;
  contrast: number;
  
  // Advanced
  hidePageNumbers: boolean;
  hideChapterTitles: boolean;
  autoHideToolbar: boolean;
  smoothScrolling: boolean;
  pageTransition: 'none' | 'fade' | 'slide';
  readingSpeed: number; // words per minute for time estimates
}

interface ReadingSettingsPanelProps {
  visible: boolean;
  settings: ReadingSettings;
  onSettingsChange: (settings: Partial<ReadingSettings>) => void;
  onClose: () => void;
  onReset: () => void;
}

const FONT_FAMILIES = [
  { value: 'system-ui', name: 'System', preview: 'Aa' },
  { value: 'Georgia, serif', name: 'Georgia', preview: 'Aa' },
  { value: "'Merriweather', serif", name: 'Merriweather', preview: 'Aa' },
  { value: "'Lora', serif", name: 'Lora', preview: 'Aa' },
  { value: "'Inter', sans-serif", name: 'Inter', preview: 'Aa' },
  { value: "'Open Sans', sans-serif", name: 'Open Sans', preview: 'Aa' },
  { value: "'Lexend', sans-serif", name: 'Lexend', preview: 'Aa' },
  { value: "'JetBrains Mono', monospace", name: 'Mono', preview: 'Aa' },
  { value: "'OpenDyslexic', sans-serif", name: 'Dyslexic', preview: 'Aa' }
];

const THEMES = [
  { value: 'light', icon: SunIcon, label: 'Light', bg: '#ffffff', fg: '#000000' },
  { value: 'dark', icon: MoonIcon, label: 'Dark', bg: '#1a1a1a', fg: '#e0e0e0' },
  { value: 'sepia', icon: SparklesIcon, label: 'Sepia', bg: '#f4ecd8', fg: '#5c4b37' },
  { value: 'night', icon: BookOpenIcon, label: 'Night', bg: '#000000', fg: '#888888' }
];

const PRESETS = [
  {
    name: 'Comfortable',
    icon: ComputerDesktopIcon,
    settings: {
      fontSize: 18,
      lineHeight: 1.8,
      marginHorizontal: 60,
      columnCount: 1 as const
    }
  },
  {
    name: 'Compact',
    icon: DevicePhoneMobileIcon,
    settings: {
      fontSize: 16,
      lineHeight: 1.6,
      marginHorizontal: 20,
      columnCount: 1 as const
    }
  },
  {
    name: 'Two Column',
    icon: TableCellsIcon,
    settings: {
      fontSize: 16,
      lineHeight: 1.7,
      marginHorizontal: 40,
      columnCount: 2 as const
    }
  },
  {
    name: 'Focus',
    icon: DocumentTextIcon,
    settings: {
      fontSize: 20,
      lineHeight: 2.0,
      marginHorizontal: 80,
      maxWidth: 720
    }
  }
];

export const ReadingSettingsPanel: React.FC<ReadingSettingsPanelProps> = ({
  visible,
  settings,
  onSettingsChange,
  onClose,
  onReset
}) => {
  const [activeTab, setActiveTab] = useState<'typography' | 'layout' | 'theme' | 'advanced'>('typography');
  
  const handleSliderChange = (key: keyof ReadingSettings, value: number) => {
    onSettingsChange({ [key]: value });
  };
  
  const handleSelectChange = (key: keyof ReadingSettings, value: string | number | boolean) => {
    onSettingsChange({ [key]: value });
  };
  
  const handleToggleChange = (key: keyof ReadingSettings, value: boolean) => {
    onSettingsChange({ [key]: value });
  };
  
  const applyPreset = (preset: typeof PRESETS[0]) => {
    onSettingsChange(preset.settings);
  };
  
  return (
    <div className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ${
      visible ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="h-full w-96 glass-strong shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AdjustmentsVerticalIcon className="w-5 h-5" />
              Reading Settings
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onReset}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Reset"
                title="Reset to defaults"
              >
                <ArrowPathIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Presets */}
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all flex flex-col items-center gap-2"
              >
                <preset.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-black/5 dark:border-white/5">
          {(['typography', 'layout', 'theme', 'advanced'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'text-[rgb(var(--accent))] border-b-2 border-[rgb(var(--accent))]'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'typography' && (
            <>
              {/* Font Family */}
              <div>
                <label className="text-sm font-medium mb-3 block">Font Family</label>
                <div className="grid grid-cols-3 gap-2">
                  {FONT_FAMILIES.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => handleSelectChange('fontFamily', font.value)}
                      className={`p-3 rounded-lg border transition-all ${
                        settings.fontFamily === font.value
                          ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10'
                          : 'border-[rgb(var(--border))]/10 hover:border-[rgb(var(--border))]/20'
                      }`}
                    >
                      <div className="text-lg" style={{ fontFamily: font.value }}>
                        {font.preview}
                      </div>
                      <div className="text-xs mt-1">{font.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Font Size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Font Size</label>
                  <span className="text-sm text-muted">{settings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="32"
                  value={settings.fontSize}
                  onChange={(e) => handleSliderChange('fontSize', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted">12</span>
                  <span className="text-xs text-muted">32</span>
                </div>
              </div>
              
              {/* Line Height */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Line Height</label>
                  <span className="text-sm text-muted">{settings.lineHeight}</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) => handleSliderChange('lineHeight', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted">Tight</span>
                  <span className="text-xs text-muted">Loose</span>
                </div>
              </div>
              
              {/* Letter Spacing */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Letter Spacing</label>
                  <span className="text-sm text-muted">{settings.letterSpacing}px</span>
                </div>
                <input
                  type="range"
                  min="-0.5"
                  max="2"
                  step="0.1"
                  value={settings.letterSpacing}
                  onChange={(e) => handleSliderChange('letterSpacing', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
              </div>
              
              {/* Text Alignment */}
              <div>
                <label className="text-sm font-medium mb-2 block">Text Alignment</label>
                <div className="flex gap-2">
                  {(['left', 'justify', 'center'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => handleSelectChange('textAlign', align)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        settings.textAlign === align
                          ? 'bg-[rgb(var(--accent))] text-white'
                          : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      {align.charAt(0).toUpperCase() + align.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Hyphenation */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Hyphenation</label>
                <button
                  onClick={() => handleToggleChange('hyphenation', !settings.hyphenation)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.hyphenation ? 'bg-[rgb(var(--accent))]' : 'bg-black/20 dark:bg-white/20'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.hyphenation ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </>
          )}
          
          {activeTab === 'layout' && (
            <>
              {/* Column Layout */}
              <div>
                <label className="text-sm font-medium mb-2 block">Column Layout</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectChange('columnCount', 1)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      settings.columnCount === 1
                        ? 'bg-[rgb(var(--accent))] text-white'
                        : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    Single
                  </button>
                  <button
                    onClick={() => handleSelectChange('columnCount', 2)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      settings.columnCount === 2
                        ? 'bg-[rgb(var(--accent))] text-white'
                        : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    Two Column
                  </button>
                </div>
              </div>
              
              {/* Horizontal Margins */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Side Margins</label>
                  <span className="text-sm text-muted">{settings.marginHorizontal}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  value={settings.marginHorizontal}
                  onChange={(e) => handleSliderChange('marginHorizontal', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
              </div>
              
              {/* Vertical Margins */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Top/Bottom Margins</label>
                  <span className="text-sm text-muted">{settings.marginVertical}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={settings.marginVertical}
                  onChange={(e) => handleSliderChange('marginVertical', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
              </div>
              
              {/* Max Width */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Max Width</label>
                  <span className="text-sm text-muted">
                    {settings.maxWidth === 0 ? 'Full' : `${settings.maxWidth}px`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1200"
                  step="40"
                  value={settings.maxWidth}
                  onChange={(e) => handleSliderChange('maxWidth', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
              </div>
              
              {/* Scroll Mode */}
              <div>
                <label className="text-sm font-medium mb-2 block">Reading Mode</label>
                <div className="space-y-2">
                  {(['paginated', 'scrolled', 'continuous'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleSelectChange('scrollMode', mode)}
                      className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-all ${
                        settings.scrollMode === mode
                          ? 'bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] border border-[rgb(var(--accent))]/30'
                          : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="font-medium">{mode.charAt(0).toUpperCase() + mode.slice(1)}</div>
                      <div className="text-xs text-muted mt-1">
                        {mode === 'paginated' && 'Click or swipe to turn pages'}
                        {mode === 'scrolled' && 'Scroll vertically through content'}
                        {mode === 'continuous' && 'Infinite scroll with no page breaks'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'theme' && (
            <>
              {/* Theme Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Reading Theme</label>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => handleSelectChange('theme', theme.value)}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        settings.theme === theme.value
                          ? 'border-[rgb(var(--accent))] shadow-lg scale-105'
                          : 'border-[rgb(var(--border))]/10 hover:border-[rgb(var(--border))]/20'
                      }`}
                      style={{ backgroundColor: theme.bg }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <theme.icon className="w-6 h-6" style={{ color: theme.fg }} />
                        <span className="text-sm font-medium" style={{ color: theme.fg }}>
                          {theme.label}
                        </span>
                      </div>
                      {settings.theme === theme.value && (
                        <CheckIcon className="absolute top-2 right-2 w-4 h-4 text-[rgb(var(--accent))]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Brightness */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Brightness</label>
                  <span className="text-sm text-muted">{settings.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={settings.brightness}
                  onChange={(e) => handleSliderChange('brightness', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
              </div>
              
              {/* Contrast */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Contrast</label>
                  <span className="text-sm text-muted">{settings.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={settings.contrast}
                  onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
              </div>
            </>
          )}
          
          {activeTab === 'advanced' && (
            <>
              {/* Reading Speed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Reading Speed</label>
                  <span className="text-sm text-muted">{settings.readingSpeed} WPM</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="400"
                  step="10"
                  value={settings.readingSpeed}
                  onChange={(e) => handleSliderChange('readingSpeed', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
                <div className="text-xs text-muted mt-1">
                  Used to estimate reading time
                </div>
              </div>
              
              {/* Page Transition */}
              <div>
                <label className="text-sm font-medium mb-2 block">Page Transition</label>
                <div className="flex gap-2">
                  {(['none', 'fade', 'slide'] as const).map((transition) => (
                    <button
                      key={transition}
                      onClick={() => handleSelectChange('pageTransition', transition)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        settings.pageTransition === transition
                          ? 'bg-[rgb(var(--accent))] text-white'
                          : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      {transition.charAt(0).toUpperCase() + transition.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Toggle Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Hide Page Numbers</label>
                  <button
                    onClick={() => handleToggleChange('hidePageNumbers', !settings.hidePageNumbers)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.hidePageNumbers ? 'bg-[rgb(var(--accent))]' : 'bg-black/20 dark:bg-white/20'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.hidePageNumbers ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Hide Chapter Titles</label>
                  <button
                    onClick={() => handleToggleChange('hideChapterTitles', !settings.hideChapterTitles)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.hideChapterTitles ? 'bg-[rgb(var(--accent))]' : 'bg-black/20 dark:bg-white/20'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.hideChapterTitles ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Auto-hide Toolbar</label>
                  <button
                    onClick={() => handleToggleChange('autoHideToolbar', !settings.autoHideToolbar)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.autoHideToolbar ? 'bg-[rgb(var(--accent))]' : 'bg-black/20 dark:bg-white/20'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.autoHideToolbar ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Smooth Scrolling</label>
                  <button
                    onClick={() => handleToggleChange('smoothScrolling', !settings.smoothScrolling)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.smoothScrolling ? 'bg-[rgb(var(--accent))]' : 'bg-black/20 dark:bg-white/20'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.smoothScrolling ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};