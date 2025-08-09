import Link from "next/link";
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/logout/actions';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="min-h-dvh flex items-center justify-center relative overflow-hidden bg-[rgb(var(--bg))]">
      {/* Premium animated gradient background with depth */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10 opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-[rgb(var(--bg))] to-transparent" />
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-gradient-radial from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-48 -right-48 w-[600px] h-[600px] bg-gradient-radial from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-emerald-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
      </div>
      
      <div className="container-px w-full max-w-5xl text-center space-y-16 relative z-10">
        {/* Premium Hero section with refined typography */}
        <div className="space-y-8">
          <h1 className="text-[clamp(3.5rem,12vw,8rem)] font-bold tracking-[-0.04em] leading-[0.85] entrance-fade" style={{ animationDelay: '0.1s' }}>
            <span className="bg-gradient-to-br from-[rgb(var(--fg))] via-[rgb(var(--accent))] to-[rgb(var(--fg))] bg-clip-text text-transparent bg-[length:200%_200%] animate-gradient">
              Arcadia Reader
            </span>
          </h1>
          <p className="text-[clamp(1.25rem,3vw,2rem)] text-muted font-medium tracking-[-0.02em] max-w-3xl mx-auto leading-relaxed entrance-slide-up" style={{ animationDelay: '0.3s' }}>
            A literary sanctuary for the digital age
          </p>
          <p className="text-[clamp(0.95rem,1.8vw,1.15rem)] text-muted/80 font-normal max-w-2xl mx-auto tracking-normal entrance-slide-up" style={{ animationDelay: '0.5s' }}>
            Experience the perfect fusion of timeless reading pleasure and modern digital convenience
          </p>
        </div>
        
        {/* Premium Authentication Card */}
        {user && (
          <div className="glass rounded-2xl p-8 max-w-md mx-auto entrance-scale" style={{ animationDelay: '0.7s' }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[rgb(var(--accent))] to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm text-muted font-medium">Welcome back</p>
                <p className="font-semibold text-foreground text-base tracking-tight">{user.email}</p>
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-muted hover:text-red-500 font-medium transition-all hover:scale-105 inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </form>
          </div>
        )}
        
        {!user && (
          <div className="glass rounded-2xl p-10 max-w-md mx-auto entrance-scale" style={{ animationDelay: '0.7s' }}>
            <div className="mb-8 text-center">
              <h3 className="text-2xl font-semibold mb-3 text-foreground">Start Your Journey</h3>
              <p className="text-base text-muted">Sign in to unlock your personal library and sync across all devices</p>
            </div>
            <Link
              href="/login"
              className="btn-primary w-full text-base py-3 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              Sign In / Sign Up
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}
        
        {/* Enhanced navigation buttons with hover effects */}
        <div className="flex items-center justify-center gap-6 flex-wrap entrance-slide-up" style={{ animationDelay: '0.9s' }}>
          <Link 
            href="/library" 
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl font-semibold text-base transition-all hover:scale-105 hover:shadow-xl hover:shadow-[rgb(var(--accent))]/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            <span className="relative">My Library</span>
          </Link>
          <Link 
            href="/reader" 
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-semibold text-base transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
            <svg className="w-5 h-5 transition-transform group-hover:rotate-12 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="relative z-10">Start Reading</span>
          </Link>
        </div>
        
        {/* Premium Feature Cards with enhanced glass effect */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto">
          <div className="group relative glass rounded-2xl p-8 text-center space-y-6 hover:transform hover:-translate-y-2 transition-all duration-300 entrance-scale cursor-pointer" style={{ animationDelay: '1.1s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-600/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-xl">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="relative space-y-3">
              <h3 className="font-bold text-xl tracking-tight text-foreground">Pure Focus</h3>
              <p className="text-sm text-muted leading-relaxed">Distraction-free reading with intelligent UI that appears only when needed</p>
            </div>
          </div>
          <div className="group relative glass rounded-2xl p-8 text-center space-y-6 hover:transform hover:-translate-y-2 transition-all duration-300 entrance-scale cursor-pointer" style={{ animationDelay: '1.3s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-600/5 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 shadow-xl">
              <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="relative space-y-3">
              <h3 className="font-bold text-xl tracking-tight text-foreground">Perfect Typography</h3>
              <p className="text-sm text-muted leading-relaxed">Crafted reading experience with customizable fonts and optimal line spacing</p>
            </div>
          </div>
          <div className="group relative glass rounded-2xl p-8 text-center space-y-6 hover:transform hover:-translate-y-2 transition-all duration-300 entrance-scale cursor-pointer" style={{ animationDelay: '1.5s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-600/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-xl">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <div className="relative space-y-3">
              <h3 className="font-bold text-xl tracking-tight text-foreground">Smart Annotations</h3>
              <p className="text-sm text-muted leading-relaxed">Highlight, annotate, and organize your thoughts with powerful note-taking tools</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
