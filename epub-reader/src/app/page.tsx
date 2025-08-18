'use client'
import type { User } from '@supabase/supabase-js';
import Link from "next/link";
import { useState, useEffect } from 'react';

import { logout } from '@/app/logout/actions';
import AuthModal from '@/components/AuthModal';
import { createClient } from '@/utils/supabase/client';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
      if (event === 'SIGNED_IN') {
        setIsAuthModalOpen(false);
        // Redirect to library after successful auth
        window.location.href = '/library';
      }
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

  return (
    <main className="min-h-dvh bg-[rgb(var(--bg))] relative">
      {/* Subtle gradient + grid overlay (no circles) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgb(var(--fg))]/[0.02]" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 h-[40vh] bg-gradient-to-b from-[rgba(var(--accent),0.08)] to-transparent" aria-hidden="true" />
      </div>
      
      <div className="relative z-10">
        {/* Navigation Bar with glassmorphism */}
        <nav className="w-full px-8 lg:px-12 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="reader-glass rounded-2xl px-8 py-4 flex items-center justify-between">
              <div className="font-bold text-xl tracking-tight text-[rgb(var(--fg))]">Arcadia</div>
              {user ? (
                <div className="flex items-center gap-6">
                  <span className="text-sm text-[rgb(var(--muted))]">{user.email}</span>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="text-sm font-medium text-[rgb(var(--fg))] active:text-red-600 dark:active:text-red-400 transition-colors px-4 py-2 rounded-lg active:bg-white/10 dark:active:bg-white/5 touch-manipulation"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-5 py-2.5 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-medium rounded-lg active:opacity-90 transition-all shadow-lg touch-manipulation"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-8 lg:px-12 pt-24 pb-32 relative z-10">
          <div className="max-w-4xl">
            <h1 className="text-[clamp(3rem,8vw,6rem)] font-bold leading-[0.9] tracking-[-0.03em] mb-8">
              <span className="accent-underline text-[rgb(var(--fg))]">Read</span>
              <span className="text-[rgb(var(--muted))]/40">.</span>
              <br />
              <span className="accent-underline text-[rgb(var(--fg))]">Annotate</span>
              <span className="text-[rgb(var(--muted))]/40">.</span>
              <br />
              <span className="accent-underline text-[rgb(var(--fg))]">Remember</span>
              <span className="text-[rgb(var(--muted))]/40">.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-[rgb(var(--muted))] max-w-2xl mb-12 leading-relaxed">
              A professional EPUB reader designed for focus and productivity. 
              Built for readers who value their time and attention.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              {user ? (
                <Link 
                  href="/library" 
                  className="group px-8 py-4 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-semibold rounded-xl active:opacity-90 active:scale-[1.02] transition-all inline-flex items-center gap-3 shadow-lg shadow-black/10 dark:shadow-white/5 touch-manipulation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                  Enter Your Library
                  <svg className="w-4 h-4 group-active:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="group px-8 py-4 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-semibold rounded-xl active:opacity-90 active:scale-[1.02] transition-all inline-flex items-center gap-3 shadow-lg shadow-black/10 dark:shadow-white/5 touch-manipulation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Begin Reading
                  <svg className="w-4 h-4 group-active:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              
              {!user && (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-8 py-4 bg-[rgb(var(--bg))] border-2 border-[rgb(var(--fg))] text-[rgb(var(--fg))] font-semibold rounded-xl active:bg-[rgb(var(--fg))] active:text-[rgb(var(--bg))] transition-all inline-flex items-center gap-3 shadow-sm touch-manipulation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Create Account
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Features Grid with Glassmorphism */}
        <div className="max-w-7xl mx-auto px-8 lg:px-12 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="reader-floating no-top-glint rounded-2xl p-12 group hover-lift transition-all duration-300 touch-manipulation">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-5 w-1.5 rounded bg-[rgb(var(--accent))]" />
                <span className="h-px flex-1 bg-[rgba(var(--border),var(--border-opacity))]" />
              </div>
              <h3 className="font-semibold text-xl mb-3 text-[rgb(var(--fg))]">Distraction-Free</h3>
              <p className="text-[rgb(var(--muted))] leading-relaxed">
                Minimal interface that adapts to your reading flow. UI elements appear only when needed.
              </p>
            </div>

            <div className="reader-floating no-top-glint rounded-2xl p-12 group hover-lift transition-all duration-300 touch-manipulation">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-5 w-1.5 rounded bg-[rgb(var(--accent))]" />
                <span className="h-px flex-1 bg-[rgba(var(--border),var(--border-opacity))]" />
              </div>
              <h3 className="font-semibold text-xl mb-3 text-[rgb(var(--fg))]">Smart Annotations</h3>
              <p className="text-[rgb(var(--muted))] leading-relaxed">
                Highlight, take notes, and organize your thoughts with precision and ease.
              </p>
            </div>

            <div className="reader-floating no-top-glint rounded-2xl p-12 group hover-lift transition-all duration-300 touch-manipulation">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-5 w-1.5 rounded bg-[rgb(var(--accent))]" />
                <span className="h-px flex-1 bg-[rgba(var(--border),var(--border-opacity))]" />
              </div>
              <h3 className="font-semibold text-xl mb-3 text-[rgb(var(--fg))]">Beautiful Typography</h3>
              <p className="text-[rgb(var(--muted))] leading-relaxed">
                Carefully crafted reading experience with customizable fonts and perfect spacing.
              </p>
            </div>

            <div className="reader-floating no-top-glint rounded-2xl p-12 group hover-lift transition-all duration-300 touch-manipulation">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-5 w-1.5 rounded bg-[rgb(var(--accent))]" />
                <span className="h-px flex-1 bg-[rgba(var(--border),var(--border-opacity))]" />
              </div>
              <h3 className="font-semibold text-xl mb-3 text-[rgb(var(--fg))]">Cloud Sync</h3>
              <p className="text-[rgb(var(--muted))] leading-relaxed">
                Your library, progress, and annotations sync seamlessly across all your devices.
              </p>
            </div>

            <div className="reader-floating no-top-glint rounded-2xl p-12 group hover-lift transition-all duration-300 touch-manipulation">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-5 w-1.5 rounded bg-[rgb(var(--accent))]" />
                <span className="h-px flex-1 bg-[rgba(var(--border),var(--border-opacity))]" />
              </div>
              <h3 className="font-semibold text-xl mb-3 text-[rgb(var(--fg))]">Lightning Fast</h3>
              <p className="text-[rgb(var(--muted))] leading-relaxed">
                Optimized performance ensures smooth reading even with large EPUB files.
              </p>
            </div>

            <div className="reader-floating no-top-glint rounded-2xl p-12 group hover-lift transition-all duration-300 touch-manipulation">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-5 w-1.5 rounded bg-[rgb(var(--accent))]" />
                <span className="h-px flex-1 bg-[rgba(var(--border),var(--border-opacity))]" />
              </div>
              <h3 className="font-semibold text-xl mb-3 text-[rgb(var(--fg))]">Reading Goals</h3>
              <p className="text-[rgb(var(--muted))] leading-relaxed">
                Track your progress and set daily reading goals to build consistent habits.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="border-t border-[rgb(var(--border))]/[var(--border-opacity)]">
          <div className="max-w-7xl mx-auto px-8 lg:px-12 py-24 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[rgb(var(--fg))]">
              Start reading today
            </h2>
            <p className="text-lg text-[rgb(var(--muted))] mb-8 max-w-2xl mx-auto">
              Join thousands of readers who&#39;ve made Arcadia their digital reading home.
            </p>
{user ? (
              <Link 
                href="/library"
                className="inline-flex items-center gap-3 px-10 py-4 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-semibold text-lg rounded-xl active:opacity-90 active:scale-[1.02] transition-all shadow-lg shadow-black/10 dark:shadow-white/5 touch-manipulation"
              >
                Open Your Library
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-3 px-10 py-4 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-semibold text-lg rounded-xl active:opacity-90 active:scale-[1.02] transition-all shadow-lg shadow-black/10 dark:shadow-white/5 touch-manipulation"
              >
                Start Reading Today
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Authentication Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </main>
  );
}