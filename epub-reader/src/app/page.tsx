import Link from "next/link";
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/logout/actions';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="min-h-dvh flex items-center justify-center relative overflow-hidden bg-[rgb(var(--bg))]">
      {/* Premium gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent))]/5 via-transparent to-[rgb(var(--accent))]/3 opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-[rgb(var(--bg))] to-transparent" />
      </div>
      
      <div className="container-px w-full max-w-4xl text-center space-y-12 relative z-10">
        {/* Hero section - Apple-style typography */}
        <div className="space-y-6 animate-fade-in">
          <h1 className="text-[64px] sm:text-[80px] lg:text-[96px] font-semibold tracking-[-0.04em] leading-[0.95] text-foreground">
            Arcadia Reader
          </h1>
          <p className="text-2xl sm:text-3xl text-foreground font-medium tracking-tight max-w-2xl mx-auto leading-tight">
            A literary sanctuary for the digital age.
          </p>
          <p className="text-lg text-muted font-normal max-w-xl mx-auto tracking-normal">
            Immerse yourself in the written word with pristine typography and thoughtful design.
          </p>
        </div>
        
        {/* Authentication status - Refined */}
        {user && (
          <div className="floating rounded-[var(--radius-xl)] p-6 max-w-md mx-auto animate-scale-in">
            <p className="text-sm text-muted font-medium mb-2">Welcome back</p>
            <p className="font-semibold text-foreground text-lg tracking-tight mb-4">{user.email}</p>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
        
        {!user && (
          <div className="floating rounded-[var(--radius-xl)] p-6 max-w-md mx-auto animate-scale-in">
            <p className="text-base text-muted font-medium mb-4">Sign in to access your library and sync your reading progress</p>
            <Link
              href="/login"
              className="btn-primary w-full"
            >
              Sign In / Sign Up
            </Link>
          </div>
        )}
        
        {/* Premium navigation buttons - Apple style */}
        <div className="flex items-center justify-center gap-4 flex-wrap animate-slide-up">
          <Link 
            href="/library" 
            className="btn-secondary inline-flex items-center gap-2.5 px-6 py-3 text-base font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            My Library
          </Link>
          <Link 
            href="/reader" 
            className="btn-primary inline-flex items-center gap-2.5 px-6 py-3 text-base font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Start Reading
          </Link>
        </div>
        
        {/* Feature highlights - Apple-style cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
          <div className="card rounded-[var(--radius-xl)] p-8 text-center space-y-4 hover:shadow-xl transition-all group animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="w-16 h-16 mx-auto rounded-[var(--radius-lg)] bg-[rgb(var(--accent))]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-[rgb(var(--accent))]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-xl tracking-tight">Pure Reading</h3>
            <p className="text-base text-muted leading-relaxed">Nothing between you and the words. Controls fade away, leaving only the story.</p>
          </div>
          <div className="card rounded-[var(--radius-xl)] p-8 text-center space-y-4 hover:shadow-xl transition-all group animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="w-16 h-16 mx-auto rounded-[var(--radius-lg)] bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-xl tracking-tight">Beautiful Typography</h3>
            <p className="text-base text-muted leading-relaxed">Every letter placed with intention. Reading as it was meant to be.</p>
          </div>
          <div className="card rounded-[var(--radius-xl)] p-8 text-center space-y-4 hover:shadow-xl transition-all group animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="w-16 h-16 mx-auto rounded-[var(--radius-lg)] bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <h3 className="font-semibold text-xl tracking-tight">Thoughtful Annotations</h3>
            <p className="text-base text-muted leading-relaxed">Highlight passages, leave notes, create your own marginalia in the digital realm.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
