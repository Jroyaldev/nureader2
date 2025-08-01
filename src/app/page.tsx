import Link from "next/link";
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/logout/actions';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="min-h-dvh flex items-center justify-center relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/10" />
      
      <div className="container-px w-full max-w-4xl text-center space-y-12 relative z-10">
        {/* Hero section with elegant typography */}
        <div className="space-y-6">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent">
            Arcadia Reader
          </h1>
          <p className="text-xl sm:text-2xl text-muted font-light max-w-2xl mx-auto leading-relaxed">
            A literary sanctuary for the digital age.
          </p>
          <p className="text-base text-muted/80 max-w-xl mx-auto">
            Immerse yourself in the written word with pristine typography and thoughtful design.
          </p>
        </div>
        
        {/* Authentication status */}
        {user && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-700/50 max-w-md mx-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Welcome back!</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{user.email}</p>
            <form action={logout} className="mt-3">
              <button
                type="submit"
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
        
        {!user && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-700/50 max-w-md mx-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Sign in to access your library and sync your reading progress</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Sign In / Sign Up
            </Link>
          </div>
        )}
        
        {/* Premium navigation buttons */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <Link 
            href="/library" 
            className="btn-secondary inline-flex items-center gap-2 text-base group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            My Library
          </Link>
          <Link 
            href="/reader" 
            className="btn-primary inline-flex items-center gap-2 text-base group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Start Reading
          </Link>
        </div>
        
        {/* Elegant feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="font-medium text-lg">Pure Reading</h3>
            <p className="text-sm text-muted leading-relaxed">Nothing between you and the words. Controls fade away, leaving only the story.</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
            </div>
            <h3 className="font-medium text-lg">Beautiful Typography</h3>
            <p className="text-sm text-muted leading-relaxed">Every letter placed with intention. Reading as it was meant to be.</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-medium text-lg">Thoughtful Annotations</h3>
            <p className="text-sm text-muted leading-relaxed">Highlight passages, leave notes, create your own marginalia in the digital realm.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
