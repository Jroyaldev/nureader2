"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { UserIcon, ArrowLeftIcon, CheckIcon } from "@heroicons/react/24/outline";

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
        setFormData({
          username: profileData.username || '',
          full_name: profileData.full_name || '',
          theme: profileData.preferences?.theme || 'system',
          font_size: profileData.preferences?.font_size || 16,
          reading_goal: profileData.preferences?.reading_goal || 20
        });
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
  }, [supabase, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/10">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
          <p className="text-lg font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/10">
      <div className="container-px py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-light tracking-tight">Profile Settings</h1>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Profile Card */}
          <div className="bg-surface rounded-3xl p-8 shadow-lg mb-8">
            {/* Avatar Section */}
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <UserIcon className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-medium mb-1">
                  {formData.full_name || formData.username || 'Anonymous Reader'}
                </h2>
                <p className="text-muted text-sm">Manage your reading profile and preferences</p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-6">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter a unique username"
                />
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Reading Preferences */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium mb-4">Reading Preferences</h3>
                
                {/* Theme */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Theme</label>
                  <select
                    value={formData.theme}
                    onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' | 'system' }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="system">System (Auto)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                {/* Font Size */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Font Size ({formData.font_size}px)
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={formData.font_size}
                    onChange={(e) => setFormData(prev => ({ ...prev, font_size: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>

                {/* Reading Goal */}
                <div>
                  <label htmlFor="reading_goal" className="block text-sm font-medium mb-2">
                    Daily Reading Goal (minutes)
                  </label>
                  <input
                    id="reading_goal"
                    type="number"
                    min="5"
                    max="480"
                    value={formData.reading_goal}
                    onChange={(e) => setFormData(prev => ({ ...prev, reading_goal: parseInt(e.target.value) || 20 }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-8 border-t border-gray-200 dark:border-gray-700">
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckIcon className="w-4 h-4" />
                  Profile saved successfully!
                </div>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => router.back()}
                  className="btn-secondary px-6 py-3"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary px-6 py-3 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}