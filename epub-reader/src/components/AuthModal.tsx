'use client'

import { useState, useEffect } from 'react'
import { login, signup } from '@/app/login/actions'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleAuth = async (formData: FormData) => {
    setIsLoading(true)
    setError('')
    
    try {
      if (isSignUp) {
        await signup(formData)
      } else {
        await login(formData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Glassmorphism backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative reader-glass rounded-2xl p-8 max-w-md w-full animate-zoom-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="font-bold text-2xl mb-2 text-[rgb(var(--fg))]">
            {isSignUp ? 'Join Arcadia' : 'Welcome back'}
          </div>
          <p className="text-[rgb(var(--muted))]">
            {isSignUp 
              ? 'Start your reading journey with beautiful, distraction-free EPUB reading'
              : 'Continue your reading journey where you left off'
            }
          </p>
        </div>

        {/* Form */}
        <form action={handleAuth} className="space-y-4">
          {/* Email field */}
          <div>
            <input
              name="email"
              type="email"
              placeholder="Email address"
              required
              className="w-full px-4 py-3 bg-[rgb(var(--bg))]/50 border border-[rgb(var(--border))]/[var(--border-opacity)] rounded-xl text-[rgb(var(--fg))] placeholder-[rgb(var(--muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))] focus:border-transparent transition-all"
            />
          </div>

          {/* Password field */}
          <div>
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              className="w-full px-4 py-3 bg-[rgb(var(--bg))]/50 border border-[rgb(var(--border))]/[var(--border-opacity)] rounded-xl text-[rgb(var(--fg))] placeholder-[rgb(var(--muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))] focus:border-transparent transition-all"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-500/10 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Toggle between sign in/up */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {/* Subtle divider */}
        <div className="mt-6 pt-6 border-t border-[rgb(var(--border))]/[var(--border-opacity)]">
          <p className="text-xs text-center text-[rgb(var(--muted))]/70">
            By continuing, you agree to our terms of service and privacy policy
          </p>
        </div>
      </div>
    </div>
  )
}