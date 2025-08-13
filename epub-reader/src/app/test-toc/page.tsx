"use client";

import React, { useState } from 'react';
import TableOfContents from '@/components/reader/TableOfContents';

// Sample TOC data for testing
const sampleTocItems = [
  {
    label: "Introduction",
    href: "#intro",
    pageNumber: 1,
  },
  {
    label: "Part I: Fundamentals",
    href: "#part1",
    pageNumber: 15,
    subitems: [
      {
        label: "Chapter 1: Getting Started",
        href: "#ch1",
        pageNumber: 16,
        subitems: [
          { label: "1.1 Installation", href: "#ch1-1", pageNumber: 17 },
          { label: "1.2 Configuration", href: "#ch1-2", pageNumber: 25 },
          { label: "1.3 First Steps", href: "#ch1-3", pageNumber: 32 },
        ],
      },
      {
        label: "Chapter 2: Core Concepts",
        href: "#ch2",
        pageNumber: 45,
        subitems: [
          { label: "2.1 Architecture Overview", href: "#ch2-1", pageNumber: 46 },
          { label: "2.2 Design Patterns", href: "#ch2-2", pageNumber: 58 },
          { label: "2.3 Best Practices", href: "#ch2-3", pageNumber: 72 },
        ],
      },
      {
        label: "Chapter 3: Advanced Topics",
        href: "#ch3",
        pageNumber: 89,
      },
    ],
  },
  {
    label: "Part II: Implementation",
    href: "#part2",
    pageNumber: 105,
    subitems: [
      {
        label: "Chapter 4: Building Your First App",
        href: "#ch4",
        pageNumber: 106,
        subitems: [
          { label: "4.1 Project Setup", href: "#ch4-1", pageNumber: 107 },
          { label: "4.2 Component Development", href: "#ch4-2", pageNumber: 120 },
          { label: "4.3 Testing", href: "#ch4-3", pageNumber: 135 },
        ],
      },
      {
        label: "Chapter 5: Deployment",
        href: "#ch5",
        pageNumber: 150,
      },
    ],
  },
  {
    label: "Part III: Reference",
    href: "#part3",
    pageNumber: 175,
    subitems: [
      { label: "API Documentation", href: "#api", pageNumber: 176 },
      { label: "Configuration Reference", href: "#config", pageNumber: 200 },
      { label: "Troubleshooting", href: "#troubleshooting", pageNumber: 220 },
    ],
  },
  {
    label: "Conclusion",
    href: "#conclusion",
    pageNumber: 240,
  },
  {
    label: "Appendices",
    href: "#appendices",
    pageNumber: 245,
    subitems: [
      { label: "Appendix A: Glossary", href: "#appendix-a", pageNumber: 246 },
      { label: "Appendix B: Resources", href: "#appendix-b", pageNumber: 255 },
      { label: "Index", href: "#index", pageNumber: 260 },
    ],
  },
];

export default function TestTocPage() {
  const [showToc, setShowToc] = useState(false);
  const [currentChapter, setCurrentChapter] = useState("Chapter 2: Core Concepts");
  const [progress, setProgress] = useState(35);
  const [isMobile, setIsMobile] = useState(false);

  const handleNavigate = (href: string) => {
    // Find the chapter from the href
    const findChapter = (items: typeof sampleTocItems, href: string): string | null => {
      for (const item of items) {
        if (item.href === href) return item.label;
        if (item.subitems) {
          const found = findChapter(item.subitems as typeof sampleTocItems, href);
          if (found) return found;
        }
      }
      return null;
    };
    
    const chapter = findChapter(sampleTocItems, href);
    if (chapter) {
      setCurrentChapter(chapter);
      // Simulate progress change
      const randomProgress = Math.floor(Math.random() * 40) + 30;
      setProgress(randomProgress);
    }
    
    console.log(`Navigate to: ${href}`);
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Table of Contents Test</h1>
        
        <div className="space-y-4 mb-8">
          <div className="flex gap-4">
            <button
              onClick={() => setShowToc(!showToc)}
              className="px-4 py-2 bg-[rgb(var(--accent))] text-white rounded-lg hover:opacity-90 transition"
            >
              {showToc ? 'Hide' : 'Show'} Table of Contents
            </button>
            
            <button
              onClick={() => setIsMobile(!isMobile)}
              className="px-4 py-2 bg-[rgba(var(--muted),0.1)] rounded-lg hover:bg-[rgba(var(--muted),0.2)] transition"
            >
              View as: {isMobile ? 'Mobile' : 'Desktop'}
            </button>
          </div>
          
          <div className="p-4 bg-[rgba(var(--muted),0.05)] rounded-lg">
            <p className="text-sm text-muted mb-2">Current Chapter:</p>
            <p className="font-medium">{currentChapter}</p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted mb-1">
                <span>Reading Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-[rgba(var(--muted),0.1)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[rgb(var(--accent))] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                const newProgress = Math.max(0, progress - 10);
                setProgress(newProgress);
              }}
              className="px-4 py-2 bg-[rgba(var(--muted),0.1)] rounded-lg hover:bg-[rgba(var(--muted),0.2)] transition"
            >
              Decrease Progress (-10%)
            </button>
            <button
              onClick={() => {
                const newProgress = Math.min(100, progress + 10);
                setProgress(newProgress);
              }}
              className="px-4 py-2 bg-[rgba(var(--muted),0.1)] rounded-lg hover:bg-[rgba(var(--muted),0.2)] transition"
            >
              Increase Progress (+10%)
            </button>
          </div>
        </div>
        
        <div className="prose prose-lg max-w-none">
          <h2>Test Instructions</h2>
          <ul>
            <li>Click "Show Table of Contents" to open the TOC panel</li>
            <li>Toggle between Mobile and Desktop views to see responsive behavior</li>
            <li>Click on chapters to navigate (simulated)</li>
            <li>Use the search feature to filter chapters</li>
            <li>Notice the current chapter highlighting</li>
            <li>Try expanding/collapsing nested chapters</li>
            <li>On desktop, use the quick navigation arrows</li>
            <li>On mobile, experience the bottom sheet design</li>
          </ul>
          
          <h3>Features Implemented:</h3>
          <ul>
            <li>✅ Responsive design (Desktop sidebar / Mobile bottom sheet)</li>
            <li>✅ Search functionality with highlighting</li>
            <li>✅ Nested chapter support with expand/collapse</li>
            <li>✅ Current chapter highlighting</li>
            <li>✅ Progress indicator</li>
            <li>✅ Quick navigation buttons</li>
            <li>✅ Smooth animations and transitions</li>
            <li>✅ Keyboard focus management</li>
            <li>✅ Touch-optimized mobile interface</li>
            <li>✅ Auto-scroll to active chapter</li>
          </ul>
        </div>
      </div>
      
      <TableOfContents
        items={sampleTocItems}
        currentChapter={currentChapter}
        onNavigate={handleNavigate}
        isOpen={showToc}
        onClose={() => setShowToc(false)}
        isMobile={isMobile}
        progress={progress}
        bookTitle="Sample Book Title"
        totalPages={275}
      />
    </div>
  );
}