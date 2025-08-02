"use client";

import TooltipImproved from "@/components/TooltipImproved";
import { useState } from "react";

export default function TestImprovedTooltipPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container mx-auto py-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Improved Tooltip Test</h1>
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Toggle Theme: {theme}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Test tooltips in different positions */}
          <div className="p-8 border rounded-lg space-y-6">
            <h2 className="text-xl font-semibold mb-4">Position Tests</h2>
            
            <div className="flex justify-center">
              <TooltipImproved content="This tooltip appears on top" position="top">
                <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                  Top Position
                </button>
              </TooltipImproved>
            </div>
            
            <div className="flex justify-center">
              <TooltipImproved content="This tooltip appears on bottom" position="bottom">
                <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Bottom Position
                </button>
              </TooltipImproved>
            </div>
            
            <div className="flex justify-center">
              <TooltipImproved content="This tooltip appears on left" position="left">
                <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                  Left Position
                </button>
              </TooltipImproved>
            </div>
            
            <div className="flex justify-center">
              <TooltipImproved content="This tooltip appears on right" position="right">
                <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
                  Right Position
                </button>
              </TooltipImproved>
            </div>
          </div>
          
          {/* Test with reader-like buttons */}
          <div className="p-8 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Reader UI Simulation</h2>
            
            <div className="flex items-center gap-2 justify-center">
              <TooltipImproved content="Previous page">
                <button className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  ←
                </button>
              </TooltipImproved>
              
              <TooltipImproved content="Next page">
                <button className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  →
                </button>
              </TooltipImproved>
              
              <TooltipImproved content={theme === "dark" ? "Light mode" : "Dark mode"}>
                <button className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  {theme === "dark" ? "🌙" : "☀️"}
                </button>
              </TooltipImproved>
              
              <TooltipImproved content="Table of contents">
                <button className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  ☰
                </button>
              </TooltipImproved>
              
              <TooltipImproved content="Annotations">
                <button className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  🖍️
                </button>
              </TooltipImproved>
              
              <TooltipImproved content="Add bookmark">
                <button className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  🔖
                </button>
              </TooltipImproved>
            </div>
          </div>
          
          {/* Edge cases */}
          <div className="p-8 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Edge Cases</h2>
            
            <div className="space-y-4">
              <TooltipImproved content="This is a very long tooltip text that should wrap properly and still be positioned correctly">
                <button className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
                  Long Content
                </button>
              </TooltipImproved>
              
              <TooltipImproved content="Quick tooltip" delay={100}>
                <button className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600">
                  Fast Delay (100ms)
                </button>
              </TooltipImproved>
              
              <TooltipImproved content="This should not show" disabled={true}>
                <button className="px-4 py-2 bg-gray-500 text-white rounded cursor-not-allowed opacity-50">
                  Disabled Tooltip
                </button>
              </TooltipImproved>
            </div>
          </div>
          
          {/* Z-index test */}
          <div className="p-8 border rounded-lg relative">
            <h2 className="text-xl font-semibold mb-4">Z-Index Test</h2>
            
            <div className="absolute top-0 right-0 bg-red-500 text-white p-4 z-50">
              High z-index element
            </div>
            
            <TooltipImproved content="This tooltip should appear above everything">
              <button className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600">
                Test Z-Index
              </button>
            </TooltipImproved>
          </div>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Tooltips should:</p>
          <ul className="mt-2 space-y-1">
            <li>✓ Appear after hovering for 500ms</li>
            <li>✓ Stay within viewport boundaries</li>
            <li>✓ Work in both light and dark themes</li>
            <li>✓ Have proper z-index (above all elements)</li>
            <li>✓ Be disabled on mobile devices</li>
          </ul>
        </div>
      </div>
    </div>
  );
}