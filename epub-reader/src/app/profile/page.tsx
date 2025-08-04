"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { UserIcon, ArrowLeftIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/providers/ThemeProvider";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  preferences: {
    theme?: 'light' | 'dark' | 'system';
    font_size?: number;
    reading_goal?: number;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { theme: currentTheme, setTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    theme: 'system' as 'light' | 'dark' | 'system',
    font_size: 16,
    reading_goal: 20
  });

  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // Try to get existing profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for new users
        throw profileError;
      }

      if (profileData) {
        setProfile(profileData);
        const savedTheme = profileData.preferences?.theme || 'system';
        setFormData({
          username: profileData.username || '',
          full_name: profileData.full_name || '',
          theme: savedTheme,
          font_size: profileData.preferences?.font_size || 16,
          reading_goal: profileData.preferences?.reading_goal || 20
        });
        // Sync theme with provider
        if (savedTheme !== currentTheme) {
          setTheme(savedTheme);
        }
      } else {
        // Create default profile for new user
        const defaultProfile: Profile = {
          id: user.id,
          username: null,
          full_name: null,
          avatar_url: null,
          preferences: {
            theme: 'system' as const,
            font_size: 16,
            reading_goal: 20
          }
        };
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(defaultProfile);
          
        if (insertError) throw insertError;
        setProfile(defaultProfile);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [supabase.auth, supabase, router, currentTheme, setTheme]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  
  // Sync form data theme with current theme
  useEffect(() => {
    if (currentTheme) {
      setFormData(prev => ({ ...prev, theme: currentTheme }));
    }
  }, [currentTheme]);

  const handleSave = async () => {
    if (!profile) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const updatedProfile = {
        username: formData.username || null,
        full_name: formData.full_name || null,
        preferences: {
          theme: formData.theme,
          font_size: formData.font_size,
          reading_goal: formData.reading_goal
        },
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', profile.id);

      if (error) throw error;
      
      setProfile({ ...profile, ...updatedProfile });
      
      // Update theme in provider
      if (formData.theme !== currentTheme) {
        setTheme(formData.theme);
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[rgb(var(--bg))]">
        <div className="floating rounded-[var(--radius-xl)] p-10 animate-scale-in">
          <div className="text-center space-y-5">
            <div className="w-12 h-12 mx-auto border-[3px] border-[rgba(var(--accent),0.2)] border-t-[rgb(var(--accent))] rounded-full animate-spin" />
            <p className="text-base font-medium tracking-tight">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-[rgb(var(--bg))] relative">
      {/* Premium gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent))]/5 via-transparent to-[rgb(var(--accent))]/3 opacity-20" />
      </div>
      
      <div className="relative z-10 py-8">
        {/* Top navigation */}
        <nav className="px-8 mb-8">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
        </nav>

        {/* Header */}
        <header className="px-8 mb-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-foreground animate-fade-in">
              Profile
            </h1>
            <p className="text-base text-muted mt-1">Manage your reading preferences</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="px-8">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sidebar - User Info */}
              <div className="lg:col-span-1">
                <div className="card rounded-[var(--radius-xl)] p-6 text-center lg:text-left animate-slide-up">
                  <div className="w-24 h-24 mx-auto lg:mx-0 mb-4 rounded-full bg-gradient-to-br from-[rgb(var(--accent))] to-[rgb(var(--accent))]/80 flex items-center justify-center">
                    <UserIcon className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold mb-1 tracking-tight">
                    {formData.full_name || formData.username || 'Reader'}
                  </h2>
                  <p className="text-sm text-muted">Member since {new Date().getFullYear()}</p>
                </div>
              </div>

              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Account Information */}
                <div className="card rounded-[var(--radius-xl)] p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <h3 className="text-lg font-semibold mb-6 tracking-tight">Account Information</h3>
                  
                  <div className="space-y-5">
                    {/* Username */}
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium mb-2 text-foreground">
                        Username
                      </label>
                      <input
                        id="username"
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-[var(--radius)] border border-[rgba(var(--border),var(--border-opacity))] bg-[rgba(var(--surface),0.5)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/40 focus:border-[rgb(var(--accent))] transition-all text-base"
                        placeholder="Choose a username"
                      />
                    </div>

                    {/* Full Name */}
                    <div>
                      <label htmlFor="full_name" className="block text-sm font-medium mb-2 text-foreground">
                        Full Name
                      </label>
                      <input
                        id="full_name"
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-[var(--radius)] border border-[rgba(var(--border),var(--border-opacity))] bg-[rgba(var(--surface),0.5)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/40 focus:border-[rgb(var(--accent))] transition-all text-base"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>
                </div>

                {/* Reading Preferences */}
                <div className="card rounded-[var(--radius-xl)] p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <h3 className="text-lg font-semibold mb-6 tracking-tight">Reading Preferences</h3>
                  
                  <div className="space-y-6">
                    {/* Theme Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-3 text-foreground">Theme</label>
                      <div className="segmented-control">
                        {[
                          { value: 'system', label: 'System' },
                          { value: 'light', label: 'Light' },
                          { value: 'dark', label: 'Dark' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setFormData(prev => ({ ...prev, theme: option.value as any }))}
                            aria-pressed={formData.theme === option.value}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <label className="block text-sm font-medium mb-3 text-foreground">
                        Font Size
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-light" style={{ fontSize: `${formData.font_size}px` }}>Aa</span>
                          <span className="text-sm font-medium text-muted">{formData.font_size}px</span>
                        </div>
                        <input
                          type="range"
                          min="12"
                          max="24"
                          value={formData.font_size}
                          onChange={(e) => setFormData(prev => ({ ...prev, font_size: parseInt(e.target.value) }))}
                          className="w-full h-2 bg-[rgba(var(--muted),0.1)] rounded-full appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, rgb(var(--accent)) 0%, rgb(var(--accent)) ${((formData.font_size - 12) / 12) * 100}%, rgba(var(--muted), 0.1) ${((formData.font_size - 12) / 12) * 100}%, rgba(var(--muted), 0.1) 100%)`
                          }}
                        />
                        <div className="flex justify-between text-xs text-muted">
                          <span>Small</span>
                          <span>Large</span>
                        </div>
                      </div>
                    </div>

                    {/* Reading Goal */}
                    <div>
                      <label htmlFor="reading_goal" className="block text-sm font-medium mb-2 text-foreground">
                        Daily Reading Goal
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          id="reading_goal"
                          type="number"
                          min="5"
                          max="480"
                          step="5"
                          value={formData.reading_goal}
                          onChange={(e) => setFormData(prev => ({ ...prev, reading_goal: parseInt(e.target.value) || 20 }))}
                          className="w-24 px-3 py-2 rounded-[var(--radius)] border border-[rgba(var(--border),var(--border-opacity))] bg-[rgba(var(--surface),0.5)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/40 focus:border-[rgb(var(--accent))] transition-all text-base text-center"
                        />
                        <span className="text-sm text-muted">minutes per day</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                onClick={() => router.back()}
                className="btn-secondary px-5 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* Status Messages */}
            {(error || success) && (
              <div className="mt-4 animate-fade-in">
                {error && (
                  <div className="text-red-500 text-sm font-medium text-center">{error}</div>
                )}
                {success && (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                    <CheckIcon className="w-4 h-4" />
                    Profile saved successfully
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}