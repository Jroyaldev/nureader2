'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  readingGoals?: {
    dailyMinutes?: number;
    weeklyBooks?: number;
    yearlyBooks?: number;
  };
  preferences?: {
    language?: string;
    timezone?: string;
    emailNotifications?: boolean;
  };
  stats?: {
    totalBooks?: number;
    totalReadingTime?: number;
    currentStreak?: number;
  };
}

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Load user and profile on mount
  useEffect(() => {
    loadUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        } else if (event === 'USER_UPDATED' && session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load current user
  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;

      if (user) {
        setUser(user);
        await loadProfile(user.id);
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Load user profile
  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          username: data.username,
          avatarUrl: data.avatar_url,
          readingGoals: data.reading_goals,
          preferences: data.preferences,
          stats: data.stats,
        });
      } else {
        // Create profile if it doesn't exist
        await createProfile(userId);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err as Error);
    }
  };

  // Create user profile
  const createProfile = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newProfile = {
        id: userId,
        email: user.email!,
        username: user.email?.split('@')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (error) throw error;

      setProfile({
        id: data.id,
        email: data.email,
        username: data.username,
        avatarUrl: data.avatar_url,
      });
    } catch (err) {
      console.error('Failed to create profile:', err);
      setError(err as Error);
    }
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user.id);
        router.push('/library');
      }
    } catch (err) {
      console.error('Sign in failed:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up
  const signUp = async (email: string, password: string, username?: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        await createProfile(data.user.id);
        
        // Show confirmation message
        console.log('Please check your email to confirm your account');
      }
    } catch (err) {
      console.error('Sign up failed:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      router.push('/');
    } catch (err) {
      console.error('Sign out failed:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error('No user logged in');

      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          username: updates.username,
          avatar_url: updates.avatarUrl,
          reading_goals: updates.readingGoals,
          preferences: updates.preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile({
        id: data.id,
        email: data.email,
        username: data.username,
        avatarUrl: data.avatar_url,
        readingGoals: data.reading_goals,
        preferences: data.preferences,
        stats: data.stats,
      });
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err as Error);
      throw err;
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    await loadUser();
  };

  const value: UserContextType = {
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Helper hook for protected routes
export const useRequireAuth = (redirectTo = '/login') => {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return { user, loading };
};