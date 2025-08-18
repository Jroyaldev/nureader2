"use client";

import React, { useState, useCallback } from 'react';
import { 
  Cog6ToothIcon, 
  SunIcon, 
  MoonIcon, 
  SparklesIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  SwatchIcon
} from '@heroicons/react/24/outline';
import { UnifiedPanel, PanelHeader, PanelContent, PanelTitle } from '@/components/ui/unified/UnifiedPanel';

interface ReadingSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  theme: 'light' | 'dark' | 'sepia';
  textAlign: 'left' | 'justify';
  marginHorizontal: number;
  marginVertical: number;
  maxWidth: number;
}

interface UnifiedSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReadingSettings;
  onSettingsChange: (settings: Partial<ReadingSettings>) => void;
}

/**
 * UnifiedSettingsPanel - Settings panel using the new UnifiedPanel system
 * 
 * BEFORE: Complex conditional rendering, mixed CSS classes, inconsistent mobile behavior
 * AFTER: Unified design system, clean responsive layout, consistent styling
 */
const UnifiedSettingsPanel: React.FC<UnifiedSettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}) => {
  const [activeTab, setActiveTab] = useState<'display' | 'layout' | 'theme'>('display');

  const handleSettingChange = useCallback((key: keyof ReadingSettings, value: any) => {
    onSettingsChange({ [key]: value });
  }, [onSettingsChange]);

  const fontFamilies = [
    { label: 'Inter', value: "'Inter', sans-serif" },
    { label: 'Georgia', value: "'Georgia', serif" },
    { label: 'Times', value: "'Times New Roman', serif" },
    { label: 'Helvetica', value: "'Helvetica Neue', sans-serif" },
    { label: 'Palatino', value: "'Palatino', serif" }
  ];

  const themes = [
    { label: 'Light', value: 'light', icon: SunIcon, description: 'Bright & focused' },
    { label: 'Dark', value: 'dark', icon: MoonIcon, description: 'Reduced eye strain' },
    { label: 'Sepia', value: 'sepia', icon: SparklesIcon, description: 'Warm & cozy' }
  ];

  const tabIcons = {
    display: ComputerDesktopIcon,
    layout: DevicePhoneMobileIcon,
    theme: SwatchIcon
  };

  const TabButton = ({ tab, label, isActive, onClick }: {
    tab: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => {
    const Icon = tabIcons[tab as keyof typeof tabIcons];
    return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all touch-manipulation ${
        isActive
          ? 'bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] border border-[rgb(var(--accent))]/20'
          : 'text-muted hover:text-foreground hover:bg-[rgba(var(--muted),0.08)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </div>
    </button>
    );
  }
  );

  const Slider = ({ 
    label, 
    value, 
    min, 
    max, 
    step = 1, 
    onChange, 
    unit = '' 
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    unit?: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="text-sm text-muted">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-[rgba(var(--muted),0.2)] rounded-full appearance-none cursor-pointer touch-manipulation
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#87a96b] [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/20
                   [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
                   [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full 
                   [&::-moz-range-thumb]:bg-[#87a96b] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                   [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:shadow-black/20
                   [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110
                   focus:outline-none focus:ring-2 focus:ring-[#87a96b]/20"
      />
    </div>
  );

  const Select = ({ 
    label, 
    value, 
    options, 
    onChange 
  }: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (value: string) => void;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-black/60 backdrop-blur-md 
                   border border-black/10 dark:border-white/10 text-foreground
                   focus:border-[rgb(var(--accent))]/30 focus:bg-white/80 dark:focus:bg-black/80 
                   focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/20
                   transition-all touch-manipulation"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <UnifiedPanel
      variant="sidebar"
      position="right"
      size="md"
      isOpen={isOpen}
      onClose={onClose}
      closeOnEscape
      ariaLabel="Reading settings"
      className="reader-floating no-top-glint"
    >
      <PanelHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[rgba(var(--muted),0.1)] dark:bg-[rgba(255,255,255,0.05)] flex items-center justify-center shadow-md">
            <Cog6ToothIcon className="w-5 h-5 text-[rgb(var(--accent))]" />
          </div>
          <div>
            <PanelTitle className="text-base font-semibold text-foreground">Reading Settings</PanelTitle>
            <p className="text-xs text-muted mt-0.5">Customize your reading experience</p>
          </div>
        </div>
      </PanelHeader>

      <PanelContent>
        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-[rgba(var(--muted),0.08)] rounded-lg mb-6">
          <TabButton 
            tab="display" 
            label="Display" 
            isActive={activeTab === 'display'} 
            onClick={() => setActiveTab('display')} 
          />
          <TabButton 
            tab="layout" 
            label="Layout" 
            isActive={activeTab === 'layout'} 
            onClick={() => setActiveTab('layout')} 
          />
          <TabButton 
            tab="theme" 
            label="Theme" 
            isActive={activeTab === 'theme'} 
            onClick={() => setActiveTab('theme')} 
          />
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'display' && (
            <>
              <Slider
                label="Font Size"
                value={settings.fontSize}
                min={12}
                max={24}
                step={1}
                unit="px"
                onChange={(value) => handleSettingChange('fontSize', value)}
              />
              
              <Select
                label="Font Family"
                value={settings.fontFamily}
                options={fontFamilies}
                onChange={(value) => handleSettingChange('fontFamily', value)}
              />
              
              <Slider
                label="Line Height"
                value={settings.lineHeight}
                min={1.2}
                max={2.0}
                step={0.1}
                onChange={(value) => handleSettingChange('lineHeight', value)}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Text Alignment</label>
                <div className="flex gap-2">
                  {(['left', 'justify'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => handleSettingChange('textAlign', align)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all touch-manipulation ${
                        settings.textAlign === align
                          ? 'bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] border border-[rgb(var(--accent))]/20'
                          : 'bg-[rgba(var(--muted),0.05)] text-muted hover:text-foreground hover:bg-[rgba(var(--muted),0.1)]'
                      }`}
                    >
                      {align === 'left' ? 'Left' : 'Justify'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'layout' && (
            <>
              <Slider
                label="Page Margins"
                value={settings.marginHorizontal}
                min={20}
                max={80}
                step={5}
                unit="px"
                onChange={(value) => handleSettingChange('marginHorizontal', value)}
              />
              
              <Slider
                label="Vertical Spacing"
                value={settings.marginVertical}
                min={10}
                max={40}
                step={5}
                unit="px"
                onChange={(value) => handleSettingChange('marginVertical', value)}
              />
              
              <Slider
                label="Max Content Width"
                value={settings.maxWidth}
                min={0}
                max={800}
                step={50}
                unit={settings.maxWidth === 0 ? ' (Full)' : 'px'}
                onChange={(value) => handleSettingChange('maxWidth', value)}
              />
            </>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-3">
              {themes.map((theme) => {
                const Icon = theme.icon;
                return (
                  <button
                    key={theme.value}
                    onClick={() => handleSettingChange('theme', theme.value)}
                    className={`w-full p-4 rounded-lg transition-all touch-manipulation text-left group ${
                      settings.theme === theme.value
                        ? 'bg-[#87a96b]/10 border-2 border-[#87a96b]/30 shadow-sm'
                        : 'bg-[rgba(var(--muted),0.05)] hover:bg-[rgba(var(--muted),0.08)] border border-[rgba(var(--border),var(--border-opacity))]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg transition-all ${
                        settings.theme === theme.value 
                          ? 'bg-[rgb(var(--accent))] text-white shadow-md' 
                          : 'bg-[rgba(var(--muted),0.1)] dark:bg-[rgba(255,255,255,0.05)] text-muted'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`font-semibold text-sm ${
                          settings.theme === theme.value 
                            ? 'text-[rgb(var(--accent))]' 
                            : 'text-foreground'
                        }`}>
                          {theme.label}
                        </div>
                        <div className="text-xs text-muted mt-0.5">{theme.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div className="mt-8 pt-6 border-t border-[rgba(var(--border),var(--border-opacity))]">
          <h4 className="text-sm font-medium text-foreground mb-3">Preview</h4>
          <div 
            className="p-4 rounded-lg bg-[rgba(var(--bg),0.5)] backdrop-blur-sm border border-[rgba(var(--border),var(--border-opacity))]"
            style={{
              fontSize: `${settings.fontSize}px`,
              fontFamily: settings.fontFamily,
              lineHeight: settings.lineHeight,
              textAlign: settings.textAlign,
              margin: `${settings.marginVertical}px ${settings.marginHorizontal}px`,
              maxWidth: settings.maxWidth === 0 ? '100%' : `${settings.maxWidth}px`
            }}
          >
            <p className="text-foreground">
              This is a preview of how your text will appear with the current settings. 
              The quick brown fox jumps over the lazy dog, demonstrating the typography 
              and layout choices you've made.
            </p>
          </div>
        </div>
      </PanelContent>
    </UnifiedPanel>
  );
};

export default UnifiedSettingsPanel;