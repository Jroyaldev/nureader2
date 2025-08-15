"use client";

import {
  XMarkIcon,
  ArrowPathIcon,
  AdjustmentsVerticalIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
  BookOpenIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import React, { useState } from 'react';

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

interface SimplifiedSettingsPanelProps {
  visible: boolean;
  settings: SimplifiedReadingSettings;
  onSettingsChange: (settings: Partial<SimplifiedReadingSettings>) => void;
  onClose: () => void;
  onReset: () => void;
}

const FONT_FAMILIES = [
  { value: 'system-ui', name: 'System', preview: 'Aa' },
  { value: 'Georgia, serif', name: 'Georgia', preview: 'Aa' },
  { value: "'Charter', serif", name: 'Charter', preview: 'Aa' },
  { value: "'Inter', sans-serif", name: 'Inter', preview: 'Aa' },
  { value: "'Atkinson Hyperlegible', sans-serif", name: 'Readable', preview: 'Aa' },
  { value: "'JetBrains Mono', monospace", name: 'Mono', preview: 'Aa' }
];

const THEMES = [
  { value: 'light', icon: SunIcon, label: 'Light', bg: '#ffffff', fg: '#000000' },
  { value: 'dark', icon: MoonIcon, label: 'Dark', bg: '#1a1a1a', fg: '#e0e0e0' },
  { value: 'sepia', icon: SparklesIcon, label: 'Sepia', bg: '#f4ecd8', fg: '#5c4b37' },
  { value: 'night', icon: BookOpenIcon, label: 'Night', bg: '#000000', fg: '#888888' }
];

const QUICK_PRESETS = [
  {
    name: 'Comfortable',
    settings: {
      fontSize: 18,
      lineHeight: 1.8,
      marginHorizontal: 60
    }
  },
  {
    name: 'Compact', 
    settings: {
      fontSize: 14,
      lineHeight: 1.5,
      marginHorizontal: 20
    }
  },
  {
    name: 'Large',
    settings: {
      fontSize: 22,
      lineHeight: 2.0,
      marginHorizontal: 40
    }
  }
];

export const SimplifiedSettingsPanel: React.FC<SimplifiedSettingsPanelProps> = ({
  visible,
  settings,
  onSettingsChange,
  onClose,
  onReset
}) => {
  const [activeTab, setActiveTab] = useState<'display' | 'reading'>('display');
  
  const handleSliderChange = (key: keyof SimplifiedReadingSettings, value: number) => {
    onSettingsChange({ [key]: value });
  };
  
  const handleSelectChange = (key: keyof SimplifiedReadingSettings, value: any) => {
    onSettingsChange({ [key]: value });
  };
  
  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    onSettingsChange(preset.settings);
  };
  
  return (
    <div className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ${
      visible ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="h-full w-80 glass-strong shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AdjustmentsVerticalIcon className="w-5 h-5" />
              Reading Settings
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={onReset}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Reset to defaults"
                title="Reset to defaults"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Quick Presets */}
          <div className="flex gap-2">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg 
                         bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 
                         transition-all"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-black/5 dark:border-white/5">
          {(['display', 'reading'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'text-[rgb(var(--accent))] border-b-2 border-[rgb(var(--accent))]'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'display' && (
            <>
              {/* Theme Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => handleSelectChange('theme', theme.value)}
                      className={`relative p-3 rounded-lg border-2 transition-all ${
                        settings.theme === theme.value
                          ? 'border-[rgb(var(--accent))] scale-105'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: theme.bg }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <theme.icon className="w-5 h-5" style={{ color: theme.fg }} />
                        <span className="text-xs font-medium" style={{ color: theme.fg }}>
                          {theme.label}
                        </span>
                      </div>
                      {settings.theme === theme.value && (
                        <CheckIcon className="absolute top-1 right-1 w-3 h-3 text-[rgb(var(--accent))]" />
                      )}
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
                  max="28"
                  value={settings.fontSize}
                  onChange={(e) => handleSliderChange('fontSize', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted">Small</span>
                  <span className="text-xs text-muted">Large</span>
                </div>
              </div>
              
              {/* Font Family */}
              <div>
                <label className="text-sm font-medium mb-2 block">Font</label>
                <div className="grid grid-cols-3 gap-2">
                  {FONT_FAMILIES.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => handleSelectChange('fontFamily', font.value)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        settings.fontFamily === font.value
                          ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10'
                          : 'border-[rgb(var(--border))]/10 hover:border-[rgb(var(--border))]/20'
                      }`}
                    >
                      <div className="text-lg leading-none" style={{ fontFamily: font.value }}>
                        {font.preview}
                      </div>
                      <div className="text-[10px] mt-1">{font.name}</div>
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
                  max="120"
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
                  min="80"
                  max="120"
                  value={settings.contrast}
                  onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
              </div>
            </>
          )}
          
          {activeTab === 'reading' && (
            <>
              {/* Line Height */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Line Spacing</label>
                  <span className="text-sm text-muted">{settings.lineHeight.toFixed(1)}</span>
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
                  <span className="text-sm text-muted">{settings.letterSpacing.toFixed(1)}px</span>
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
                  {(['left', 'justify'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => handleSelectChange('textAlign', align)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                        settings.textAlign === align
                          ? 'bg-[rgb(var(--accent))] text-white'
                          : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Side Margins */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Side Margins</label>
                  <span className="text-sm text-muted">{settings.marginHorizontal}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={settings.marginHorizontal}
                  onChange={(e) => handleSliderChange('marginHorizontal', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
              </div>
              
              {/* Max Width */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Content Width</label>
                  <span className="text-sm text-muted">
                    {settings.maxWidth === 0 ? 'Full' : `${settings.maxWidth}px`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={settings.maxWidth}
                  onChange={(e) => handleSliderChange('maxWidth', Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
              </div>
              
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
                  Used for time estimates
                </div>
              </div>
              
              {/* Auto-hide Toolbar */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Auto-hide Toolbar</label>
                <button
                  onClick={() => handleSelectChange('autoHideToolbar', !settings.autoHideToolbar)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    settings.autoHideToolbar ? 'bg-[rgb(var(--accent))]' : 'bg-black/20 dark:bg-white/20'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.autoHideToolbar ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};