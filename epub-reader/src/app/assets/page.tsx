'use client'

import type { User } from '@supabase/supabase-js';
import Link from "next/link";
import { useState, useEffect } from 'react';

import { logout } from '@/app/logout/actions';
import { createClient } from '@/utils/supabase/client';

export default function AssetsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-[rgb(var(--bg))] flex items-center justify-center">
        <div className="reader-glass rounded-2xl p-8">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-6 h-6 bg-[rgb(var(--muted))]/20 rounded"></div>
            <div className="text-[rgb(var(--muted))]">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-[rgb(var(--bg))] flex items-center justify-center">
        <div className="reader-glass rounded-2xl p-8 text-center max-w-md mx-4">
          <h2 className="text-xl font-semibold text-[rgb(var(--fg))] mb-4">Authentication Required</h2>
          <p className="text-[rgb(var(--muted))] mb-6">Please sign in to access your assets.</p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-medium rounded-lg hover:opacity-90 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-[rgb(var(--bg))]">
      {/* Navigation Bar */}
      <nav className="w-full px-4 sm:px-8 lg:px-12 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="reader-glass rounded-2xl px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
            <Link href="/" className="font-bold text-xl tracking-tight text-[rgb(var(--fg))]">
              Arcadia
            </Link>
            <div className="flex items-center gap-2 sm:gap-6">
              <span className="text-sm text-[rgb(var(--muted))] hidden xs:inline truncate max-w-[120px] sm:max-w-none">
                {user.email}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-sm font-medium text-[rgb(var(--fg))] active:text-red-600 dark:active:text-red-400 transition-colors px-3 sm:px-4 py-2 rounded-lg active:bg-white/10 dark:active:bg-white/5 touch-target"
                >
                  <span className="hidden xs:inline">Sign out</span>
                  <span className="xs:hidden">Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="reader-glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 rounded-lg bg-[rgb(var(--accent))]/10">
                <svg className="w-6 h-6 text-[rgb(var(--accent))]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--fg))]">Assets</h1>
                <p className="text-[rgb(var(--muted))] mt-1">Manage your digital assets and resources</p>
              </div>
            </div>
            
            {/* Navigation Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
              <Link href="/" className="hover:text-[rgb(var(--fg))] transition-colors">Home</Link>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[rgb(var(--fg))]">Assets</span>
            </div>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Book Assets */}
          <div className="reader-floating no-top-glint rounded-2xl p-6 group hover-lift transition-all duration-300">
            <div className="mb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl text-[rgb(var(--fg))]">Books</h3>
            </div>
            <p className="text-[rgb(var(--muted))] mb-4 leading-relaxed">
              EPUB files, covers, and book metadata stored in your library.
            </p>
            <Link 
              href="/library" 
              className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--accent))] hover:text-[rgb(var(--fg))] transition-colors"
            >
              <span>View Library</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Annotations Assets */}
          <div className="reader-floating no-top-glint rounded-2xl p-6 group hover-lift transition-all duration-300">
            <div className="mb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl text-[rgb(var(--fg))]">Annotations</h3>
            </div>
            <p className="text-[rgb(var(--muted))] mb-4 leading-relaxed">
              Highlights, notes, and bookmarks from your reading sessions.
            </p>
            <div className="text-sm font-medium text-[rgb(var(--muted))]">
              Available in reader
            </div>
          </div>

          {/* Collections Assets */}
          <div className="reader-floating no-top-glint rounded-2xl p-6 group hover-lift transition-all duration-300">
            <div className="mb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl text-[rgb(var(--fg))]">Collections</h3>
            </div>
            <p className="text-[rgb(var(--muted))] mb-4 leading-relaxed">
              Organized groups and categories for your book library.
            </p>
            <Link 
              href="/collections" 
              className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--accent))] hover:text-[rgb(var(--fg))] transition-colors"
            >
              <span>Manage Collections</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Profile Assets */}
          <div className="reader-floating no-top-glint rounded-2xl p-6 group hover-lift transition-all duration-300">
            <div className="mb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl text-[rgb(var(--fg))]">Profile</h3>
            </div>
            <p className="text-[rgb(var(--muted))] mb-4 leading-relaxed">
              User preferences, reading goals, and personal settings.
            </p>
            <Link 
              href="/profile" 
              className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--accent))] hover:text-[rgb(var(--fg))] transition-colors"
            >
              <span>View Profile</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Reading Progress Assets */}
          <div className="reader-floating no-top-glint rounded-2xl p-6 group hover-lift transition-all duration-300">
            <div className="mb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl text-[rgb(var(--fg))]">Reading Progress</h3>
            </div>
            <p className="text-[rgb(var(--muted))] mb-4 leading-relaxed">
              Track your reading history, progress, and time spent reading.
            </p>
            <div className="text-sm font-medium text-[rgb(var(--muted))]">
              Available in library
            </div>
          </div>

          {/* Storage Overview */}
          <div className="reader-floating no-top-glint rounded-2xl p-6 group hover-lift transition-all duration-300">
            <div className="mb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h3 className="font-semibold text-xl text-[rgb(var(--fg))]">Storage</h3>
            </div>
            <p className="text-[rgb(var(--muted))] mb-4 leading-relaxed">
              Your files are securely stored in organized buckets with proper access controls.
            </p>
            <div className="text-sm font-medium text-[rgb(var(--muted))]">
              Managed automatically
            </div>
          </div>
        </div>

        {/* Asset Management Info */}
        <div className="mt-8">
          <div className="reader-glass rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-[rgb(var(--fg))] mb-4">Asset Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-[rgb(var(--fg))] mb-2">Security & Privacy</h3>
                <ul className="text-sm text-[rgb(var(--muted))] space-y-1">
                  <li>• All assets are protected by Row Level Security (RLS)</li>
                  <li>• Files are organized by user ID for complete isolation</li>
                  <li>• Automatic backup and versioning for critical data</li>
                  <li>• End-to-end encryption for sensitive information</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-[rgb(var(--fg))] mb-2">Storage Organization</h3>
                <ul className="text-sm text-[rgb(var(--muted))] space-y-1">
                  <li>• Books: <code className="text-xs bg-[rgb(var(--muted))]/10 px-1 py-0.5 rounded">books/&#123;user_id&#125;/&#123;book_id&#125;/</code></li>
                  <li>• Covers: <code className="text-xs bg-[rgb(var(--muted))]/10 px-1 py-0.5 rounded">covers/&#123;user_id&#125;/&#123;book_id&#125;/</code></li>
                  <li>• Database: PostgreSQL with real-time sync</li>
                  <li>• Metadata: Extracted and indexed automatically</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}