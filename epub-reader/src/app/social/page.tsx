'use client'

import Link from "next/link";
import { useState } from 'react';

export default function SocialPage() {
  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);

  const downloadAsset = async (assetName: string, content: string) => {
    setDownloadingAsset(assetName);
    
    try {
      // Create a downloadable blob
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = assetName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingAsset(null);
    }
  };

  const logoSvg = `<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="arcadiaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#8B5CF6"/>
      <stop offset="100%" style="stop-color:#06B6D4"/>
    </linearGradient>
  </defs>
  <text x="10" y="40" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="url(#arcadiaGradient)">Arcadia</text>
  <text x="140" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#64748B">Reader</text>
</svg>`;

  const socialCopy = {
    twitter: "Discover your next favorite book with Arcadia Reader - the most beautiful way to read EPUBs. Clean design, smart annotations, and distraction-free reading. ✨📚 #ArcadiaReader #DigitalReading",
    linkedin: "Introducing Arcadia Reader: A professional EPUB reader designed for focused reading and productivity. Features include smart annotations, reading progress tracking, and a beautiful, distraction-free interface. Perfect for researchers, students, and avid readers.",
    instagram: "Your digital reading sanctuary awaits ✨ Arcadia Reader transforms how you experience books with beautiful typography, smart annotations, and seamless progress tracking. #ArcadiaReader #DigitalBooks #ReadingCommunity"
  };

  const pressKit = {
    brandColors: {
      primary: "#8B5CF6",
      secondary: "#06B6D4", 
      accent: "#F59E0B",
      background: "#101215",
      foreground: "#FCFCFD"
    },
    fonts: "Geist Sans, Geist Mono",
    taglines: [
      "A literary sanctuary for the digital age",
      "Read. Annotate. Remember.",
      "Where focus meets beautiful design"
    ]
  };

  return (
    <main className="min-h-dvh bg-[rgb(var(--bg))]">
      {/* Navigation Bar */}
      <nav className="w-full px-4 sm:px-8 lg:px-12 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="reader-glass rounded-2xl px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
            <Link href="/" className="font-bold text-xl tracking-tight text-[rgb(var(--fg))]">
              Arcadia
            </Link>
            <div className="flex items-center gap-4">
              <Link 
                href="/assets" 
                className="text-sm font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
              >
                Assets
              </Link>
              <Link 
                href="/" 
                className="text-sm font-medium text-[rgb(var(--fg))] hover:text-[rgb(var(--muted))] transition-colors"
              >
                Home
              </Link>
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v2M7 4V1a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v16l4-2 4 2 4-2 4 2V7H6z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--fg))]">Social & Marketing Assets</h1>
                <p className="text-[rgb(var(--muted))] mt-1">Download logos, share copy, and brand assets for Arcadia Reader</p>
              </div>
            </div>
            
            {/* Navigation Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
              <Link href="/" className="hover:text-[rgb(var(--fg))] transition-colors">Home</Link>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[rgb(var(--fg))]">Social Assets</span>
            </div>
          </div>
        </div>

        {/* Brand Assets Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[rgb(var(--fg))] mb-4">Brand Assets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Logo SVG */}
            <div className="reader-floating no-top-glint rounded-2xl p-6 group hover-lift transition-all duration-300">
              <div className="mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-[rgb(var(--fg))]">Logo (SVG)</h3>
              </div>
              <div className="bg-white/5 rounded-lg p-4 mb-4 flex items-center justify-center h-16">
                <div 
                  dangerouslySetInnerHTML={{ __html: logoSvg }} 
                  className="max-w-full max-h-full"
                />
              </div>
              <button
                onClick={() => downloadAsset('arcadia-logo.svg', logoSvg)}
                disabled={downloadingAsset === 'arcadia-logo.svg'}
                className="w-full px-4 py-2 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingAsset === 'arcadia-logo.svg' ? 'Downloading...' : 'Download SVG'}
              </button>
            </div>

            {/* Brand Colors */}
            <div className="reader-floating no-top-glint rounded-2xl p-6 group hover-lift transition-all duration-300">
              <div className="mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-[rgb(var(--fg))]">Brand Colors</h3>
              </div>
              <div className="space-y-2 mb-4">
                {Object.entries(pressKit.brandColors).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded border border-white/20" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-[rgb(var(--muted))] capitalize">{name}</span>
                    <code className="text-xs bg-[rgb(var(--muted))]/10 px-1 py-0.5 rounded ml-auto">{color}</code>
                  </div>
                ))}
              </div>
              <button
                onClick={() => downloadAsset('brand-colors.json', JSON.stringify(pressKit.brandColors, null, 2))}
                disabled={downloadingAsset === 'brand-colors.json'}
                className="w-full px-4 py-2 bg-[rgb(var(--fg))] text-[rgb(var(--bg))] font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingAsset === 'brand-colors.json' ? 'Downloading...' : 'Download Colors'}
              </button>
            </div>

            {/* Typography */}
            <div className="reader-floating no-top-glint rounded-2xl p-6 group hover-lift transition-all duration-300">
              <div className="mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg text-[rgb(var(--fg))]">Typography</h3>
              </div>
              <div className="mb-4">
                <p className="text-[rgb(var(--muted))] text-sm mb-2">Brand Fonts:</p>
                <div className="font-bold text-xl mb-2 text-[rgb(var(--fg))]">Arcadia</div>
                <div className="font-mono text-sm text-[rgb(var(--muted))]">Geist Sans & Geist Mono</div>
              </div>
              <div className="space-y-1 text-xs text-[rgb(var(--muted))]">
                <p>• Primary: Geist Sans</p>
                <p>• Monospace: Geist Mono</p>
                <p>• Fallback: system-ui, sans-serif</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Copy Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[rgb(var(--fg))] mb-4">Social Media Copy</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(socialCopy).map(([platform, copy]) => (
              <div key={platform} className="reader-floating no-top-glint rounded-2xl p-6 group hover-lift transition-all duration-300">
                <div className="mb-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg text-[rgb(var(--fg))] capitalize">{platform}</h3>
                </div>
                <div className="bg-[rgb(var(--muted))]/5 rounded-lg p-4 mb-4">
                  <p className="text-sm text-[rgb(var(--muted))] leading-relaxed">{copy}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(copy);
                    // You could add a toast notification here
                  }}
                  className="w-full px-4 py-2 border border-[rgb(var(--fg))] text-[rgb(var(--fg))] font-medium rounded-lg hover:bg-[rgb(var(--fg))] hover:text-[rgb(var(--bg))] transition-all"
                >
                  Copy to Clipboard
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Taglines & Messaging */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[rgb(var(--fg))] mb-4">Brand Messaging</h2>
          <div className="reader-glass rounded-2xl p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-[rgb(var(--fg))] mb-4">Taglines</h3>
                <div className="space-y-3">
                  {pressKit.taglines.map((tagline, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-[rgb(var(--muted))]/5 rounded-lg">
                      <span className="text-sm text-[rgb(var(--muted))]">{tagline}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(tagline)}
                        className="ml-auto p-1 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-[rgb(var(--fg))] mb-4">Key Features</h3>
                <ul className="space-y-2 text-sm text-[rgb(var(--muted))]">
                  <li>• Distraction-free reading interface</li>
                  <li>• Smart annotations and highlighting</li>
                  <li>• Beautiful typography and themes</li>
                  <li>• Cloud sync across devices</li>
                  <li>• Reading progress tracking</li>
                  <li>• Professional EPUB support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Guidelines */}
        <div className="reader-glass rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[rgb(var(--fg))] mb-4">Usage Guidelines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-[rgb(var(--fg))] mb-2">Brand Voice</h3>
              <ul className="text-sm text-[rgb(var(--muted))] space-y-1">
                <li>• Professional yet approachable</li>
                <li>• Focus on productivity and focus</li>
                <li>• Emphasize beautiful design</li>
                <li>• Literary and sophisticated tone</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-[rgb(var(--fg))] mb-2">Visual Guidelines</h3>
              <ul className="text-sm text-[rgb(var(--muted))] space-y-1">
                <li>• Maintain generous white space</li>
                <li>• Use gradient accents sparingly</li>
                <li>• Prefer subtle animations</li>
                <li>• Keep typography hierarchy clear</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}