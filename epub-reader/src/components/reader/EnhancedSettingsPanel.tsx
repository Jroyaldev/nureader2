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
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Mobile Backdrop */}
        <div 
          className="absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-300" 
          onClick={onClose}
        />
        
        {/* Mobile Bottom Sheet */}
        <div className={`absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-white/20 dark:border-gray-700/30 shadow-2xl transform transition-all duration-500 ease-out flex flex-col max-h-[85vh] font-inter ${visible ? 'translate-y-0' : 'translate-y-full'}`} style={{
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
        }}>
          {/* Mobile Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
          
          {/* Mobile Header */}
          <div className="px-6 pb-4 border-b border-white/10 dark:border-gray-700/30 font-inter">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <AdjustmentsVerticalIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-inter">Reading Settings</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customize your reading experience</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors active:scale-95 touch-manipulation font-inter"
              >
                <XMarkIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Mobile Tabs */}
          <div className="flex border-b border-white/10 dark:border-gray-700/30">
            {(['display', 'reading'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all relative touch-manipulation font-inter ${
                  activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab === 'display' ? (
                  <PaintBrushIcon className="w-4 h-4" />
                ) : (
                  <DocumentTextIcon className="w-4 h-4" />
                )}
                <span className="capitalize">{tab}</span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            ))}
          </div>
          
          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 font-inter">
            {activeTab === 'display' && (
              <>
                {/* Quick Presets */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white font-inter">Quick Presets</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className="group relative p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all active:scale-95 touch-manipulation font-inter"
                      >
                        <div className="text-lg mb-1">{preset.icon}</div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 font-inter">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Font Size */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900 dark:text-white font-inter">Font Size</label>
                    <span className="text-sm font-mono bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
                      {localSettings.fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="28"
                    value={localSettings.fontSize}
                    onChange={(e) => handleSliderChange('fontSize', Number(e.target.value))}
                    className="w-full h-2 bg-white/30 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg appearance-none cursor-pointer touch-manipulation"
                  />
                </div>
                
                {/* Font Family */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-900 dark:text-white font-inter">Font Family</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FONT_FAMILIES.map((font) => (
                      <button
                        key={font.value}
                        onClick={() => handleSelectChange('fontFamily', font.value)}
                        className={`p-3 rounded-xl border transition-all active:scale-95 touch-manipulation font-inter ${
                          localSettings.fontFamily === font.value
                            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 backdrop-blur-sm'
                            : 'border-white/30 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-gray-800/70'
                        }`}
                      >
                        <div className="text-lg mb-1" style={{ fontFamily: font.value }}>
                          {font.preview}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-inter">
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
                    <label className="text-sm font-medium text-gray-900 dark:text-white font-inter">Line Spacing</label>
                    <span className="text-sm font-mono bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
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
                    className="w-full h-2 bg-white/30 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg appearance-none cursor-pointer touch-manipulation"
                  />
                </div>
                
                {/* Text Alignment */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-900 dark:text-white font-inter">Text Alignment</label>
                  <div className="flex gap-2">
                    {(['left', 'justify'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => handleSelectChange('textAlign', align)}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 touch-manipulation font-inter ${
                          localSettings.textAlign === align
                            ? 'bg-blue-500 text-white shadow-md backdrop-blur-sm'
                            : 'bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-300'
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
                    <label className="text-sm font-medium text-gray-900 dark:text-white font-inter">Side Margins</label>
                    <span className="text-sm font-mono bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
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
                    className="w-full h-2 bg-white/30 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg appearance-none cursor-pointer touch-manipulation"
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Mobile Footer */}
          <div className="px-6 py-4 border-t border-white/10 dark:border-gray-700/30 safe-area-pb font-inter">
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-300 text-sm font-medium transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2 font-inter"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500/90 backdrop-blur-sm hover:bg-blue-600/90 text-white text-sm font-medium transition-all active:scale-95 touch-manipulation font-inter"
              >
                Done
              </button>
            </div>
            {hasChanges && (
              <div className="flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-400 mt-2 font-inter">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Settings saved automatically</span>
              </div>
            )}
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
      <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl flex flex-col h-full font-inter">
        {/* Header */}
        <div className="shrink-0 border-b border-white/10 dark:border-gray-700/30">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm flex items-center justify-center">
                <AdjustmentsVerticalIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight font-inter">Reading Settings</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium font-inter">
                  {hasChanges ? 'Saving...' : 'Customize your experience'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-gray-800/50 backdrop-blur-sm transition-all active:scale-95 touch-manipulation font-inter"
                aria-label="Reset to defaults"
                title="Reset to defaults"
              >
                <ArrowPathIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg hover:bg-white/20 dark:hover:bg-gray-800/50 backdrop-blur-sm transition-all active:scale-95 touch-manipulation font-inter"
                aria-label="Close"
              >
                <XMarkIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
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
                  className="flex-1 group relative overflow-hidden rounded-xl bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 p-3 active:scale-95 touch-manipulation font-inter"
                >
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-inter">
                      {preset.name}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Tabs - Enhanced */}
        <div className="shrink-0 px-6 pb-4">
          <div className="flex bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm rounded-xl p-1">
            {(['display', 'reading'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 active:scale-95 touch-manipulation font-inter ${
                  activeTab === tab
                    ? 'bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-white shadow-lg backdrop-blur-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/30 dark:hover:bg-gray-800/30'
                }`}
              >
                {tab === 'display' ? 'Display' : 'Reading'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Settings Content - Enhanced with better spacing and visuals */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {activeTab === 'display' && (
              <>
                {/* Font Size - Enhanced Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900 dark:text-white font-inter">Font Size</label>
                    <span className="text-sm font-mono bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
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
                      className="w-full h-2 bg-white/30 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg appearance-none cursor-pointer slider touch-manipulation"
                      style={{
                        background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${((localSettings.fontSize - 12) / 16) * 100}%, rgba(255,255,255,0.3) ${((localSettings.fontSize - 12) / 16) * 100}%, rgba(255,255,255,0.3) 100%)`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 font-inter">
                    <span>A</span>
                    <span className="text-base">A</span>
                    <span className="text-xl">A</span>
                  </div>
                </div>
                
                {/* Font Family - Enhanced Grid */}
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block font-inter">Font Family</label>
                  <div className="grid grid-cols-3 gap-2">
                    {FONT_FAMILIES.map((font) => (
                      <button
                        key={font.value}
                        onClick={() => handleSelectChange('fontFamily', font.value)}
                        className={`group relative p-3 rounded-xl border transition-all duration-300 active:scale-95 touch-manipulation ${
                          localSettings.fontFamily === font.value
                            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 backdrop-blur-sm'
                            : 'border-white/30 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        <div className="text-2xl leading-none mb-2" style={{ fontFamily: font.value }}>
                          {font.preview}
                        </div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-inter">
                          {font.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Display Adjustments - Grouped */}
                <div className="space-y-4 p-4 rounded-xl bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/30">
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider font-inter">Display Adjustments</h3>
                  
                  {/* Brightness */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600 dark:text-gray-400 font-inter">Brightness</label>
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400 font-inter">{localSettings.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="120"
                      value={localSettings.brightness}
                      onChange={(e) => handleSliderChange('brightness', Number(e.target.value))}
                      className="w-full h-1.5 bg-white/30 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg appearance-none cursor-pointer touch-manipulation"
                    />
                  </div>
                  
                  {/* Contrast */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600 dark:text-gray-400 font-inter">Contrast</label>
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400 font-inter">{localSettings.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="120"
                      value={localSettings.contrast}
                      onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
                      className="w-full h-1.5 bg-white/30 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg appearance-none cursor-pointer touch-manipulation"
                    />
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'reading' && (
              <>
                {/* Typography Settings */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider font-inter">Typography</h3>
                  
                  {/* Line Height */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-white font-inter">Line Spacing</label>
                      <span className="text-sm font-mono bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
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
                      className="w-full h-2 bg-white/30 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg appearance-none cursor-pointer touch-manipulation"
                    />
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 font-inter">
                      <span>Tight</span>
                      <span>Comfortable</span>
                      <span>Loose</span>
                    </div>
                  </div>
                  
                  {/* Letter Spacing */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-white font-inter">Letter Spacing</label>
                      <span className="text-sm font-mono bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
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
                      className="w-full h-2 bg-white/30 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg appearance-none cursor-pointer touch-manipulation"
                    />
                  </div>
                  
                  {/* Text Alignment */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block font-inter">Text Alignment</label>
                    <div className="flex gap-2">
                      {(['left', 'justify'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => handleSelectChange('textAlign', align)}
                          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 touch-manipulation font-inter ${
                            localSettings.textAlign === align
                              ? 'bg-blue-500 text-white shadow-md backdrop-blur-sm'
                              : 'bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {align === 'left' ? 'Left' : 'Justified'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Layout Settings */}
                <div className="space-y-4 p-4 rounded-xl bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/30">
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider font-inter">Layout</h3>
                  
                  {/* Side Margins */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600 dark:text-gray-400 font-inter">Side Margins</label>
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400 font-inter">{localSettings.marginHorizontal}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      value={localSettings.marginHorizontal}
                      onChange={(e) => handleSliderChange('marginHorizontal', Number(e.target.value))}
                      className="w-full h-1.5 bg-white/30 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg appearance-none cursor-pointer touch-manipulation"
                    />
                  </div>
                  
                  {/* Content Width */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600 dark:text-gray-400 font-inter">Max Width</label>
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400 font-inter">
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
                      className="w-full h-1.5 bg-white/30 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg appearance-none cursor-pointer touch-manipulation"
                    />
                  </div>
                </div>
                
                {/* Behavior Settings */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider font-inter">Behavior</h3>
                  
                  {/* Reading Speed */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-white font-inter">Reading Speed</label>
                      <span className="text-sm font-mono bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-2 py-1 rounded font-inter">
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
                      className="w-full h-2 bg-white/30 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg appearance-none cursor-pointer touch-manipulation"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-inter">Affects time remaining estimates</p>
                  </div>
                  
                  {/* Auto-hide Toolbar */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/30">
                    <div>
                      <label className="text-sm font-medium text-gray-900 dark:text-white font-inter">Auto-hide Toolbar</label>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-inter">Hide toolbar when reading</p>
                    </div>
                    <button
                      onClick={() => handleSelectChange('autoHideToolbar', !localSettings.autoHideToolbar)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                        localSettings.autoHideToolbar 
                          ? 'bg-blue-500' 
                          : 'bg-white/30 dark:bg-gray-700/50'
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
            <div className="flex items-center gap-2 text-xs text-blue-500 font-inter">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Settings saved automatically</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};