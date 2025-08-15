import Link from "next/link";
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/logout/actions';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="min-h-dvh bg-[rgb(var(--bg))] relative">
      {/* Subtle gradient overlay instead of bubble shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgb(var(--fg))]/[0.02]" />
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
                      className="text-sm font-medium text-[rgb(var(--fg))] hover:text-red-600 dark:hover:text-red-400 transition-colors px-4 py-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-5 py-2.5 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-medium rounded-lg hover:opacity-90 transition-all shadow-lg"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-8 lg:px-12 pt-24 pb-32">
          <div className="max-w-4xl">
            <h1 className="text-[clamp(3rem,8vw,6rem)] font-bold leading-[0.9] tracking-[-0.03em] mb-8">
              <span className="text-[rgb(var(--fg))]">Read</span>
              <span className="text-[rgb(var(--muted))]/40">.</span>
              <br />
              <span className="text-[rgb(var(--fg))]">Annotate</span>
              <span className="text-[rgb(var(--muted))]/40">.</span>
              <br />
              <span className="text-[rgb(var(--fg))]">Remember</span>
              <span className="text-[rgb(var(--muted))]/40">.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-[rgb(var(--muted))] max-w-2xl mb-12 leading-relaxed">
              A professional EPUB reader designed for focus and productivity. 
              Built for readers who value their time and attention.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/library" 
                className="group px-8 py-4 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-semibold rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all inline-flex items-center gap-3 shadow-lg shadow-black/10 dark:shadow-white/5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                Open Library
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              
              <Link 
                href="/reader" 
                className="px-8 py-4 bg-[rgb(var(--bg))] border-2 border-[rgb(var(--fg))] text-[rgb(var(--fg))] font-semibold rounded-xl hover:bg-[rgb(var(--fg))] hover:text-[rgb(var(--bg))] transition-all inline-flex items-center gap-3 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Start Reading
              </Link>

              {!user && (
                <Link
                  href="/login"
                  className="px-8 py-4 text-[rgb(var(--muted))] font-semibold hover:text-[rgb(var(--fg))] transition-colors inline-flex items-center gap-2"
                >
                  Create Account
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Features Grid with Glassmorphism */}
        <div className="max-w-7xl mx-auto px-8 lg:px-12 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="reader-floating rounded-2xl p-12 group hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[rgb(var(--accent))] to-[rgb(var(--accent))]/80 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-3 text-[rgb(var(--fg))]">Distraction-Free</h3>
              <p className="text-[rgb(var(--muted))] leading-relaxed">
                Minimal interface that adapts to your reading flow. UI elements appear only when needed.
              </p>
            </div>

            <div className="reader-floating rounded-2xl p-12 group hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[rgb(var(--accent))] to-[rgb(var(--accent))]/80 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-3 text-[rgb(var(--fg))]">Smart Annotations</h3>
              <p className="text-[rgb(var(--muted))] leading-relaxed">
                Highlight, take notes, and organize your thoughts with precision and ease.
              </p>
            </div>

            <div className="reader-floating rounded-2xl p-12 group hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[rgb(var(--accent))] to-[rgb(var(--accent))]/80 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-3 text-[rgb(var(--fg))]">Beautiful Typography</h3>
              <p className="text-[rgb(var(--muted))] leading-relaxed">
                Carefully crafted reading experience with customizable fonts and perfect spacing.
              </p>
            </div>

            <div className="reader-floating rounded-2xl p-12 group hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[rgb(var(--accent))] to-[rgb(var(--accent))]/80 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-3 text-[rgb(var(--fg))]">Cloud Sync</h3>
              <p className="text-[rgb(var(--muted))] leading-relaxed">
                Your library, progress, and annotations sync seamlessly across all your devices.
              </p>
            </div>

            <div className="reader-floating rounded-2xl p-12 group hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[rgb(var(--accent))] to-[rgb(var(--accent))]/80 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-3 text-[rgb(var(--fg))]">Lightning Fast</h3>
              <p className="text-[rgb(var(--muted))] leading-relaxed">
                Optimized performance ensures smooth reading even with large EPUB files.
              </p>
            </div>

            <div className="reader-floating rounded-2xl p-12 group hover:scale-[1.02] transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[rgb(var(--accent))] to-[rgb(var(--accent))]/80 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-3 text-[rgb(var(--fg))]">Reading Goals</h3>
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
              Join thousands of readers who've made Arcadia their digital reading home.
            </p>
            <Link 
              href={user ? "/library" : "/login"}
              className="inline-flex items-center gap-3 px-10 py-4 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-semibold text-lg rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg shadow-black/10 dark:shadow-white/5"
            >
              {user ? "Open Your Library" : "Get Started Free"}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}