"use client";

import TooltipImproved from "@/components/TooltipImproved";

export default function TestSimpleTooltipPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="space-y-8 p-8">
        <h1 className="text-2xl font-bold text-center">Simple Tooltip Test</h1>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Hover over buttons for 300ms to see tooltips
          </p>
          
          <div className="flex gap-4 justify-center">
            <TooltipImproved content="This is tooltip 1">
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Button 1
              </button>
            </TooltipImproved>
            
            <TooltipImproved content="This is tooltip 2" position="top">
              <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                Button 2
              </button>
            </TooltipImproved>
            
            <TooltipImproved content="This is tooltip 3" delay={100}>
              <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                Button 3 (Fast)
              </button>
            </TooltipImproved>
          </div>
          
          <div className="mt-8 p-4 bg-white rounded shadow">
            <h2 className="font-semibold mb-2">Debug Info:</h2>
            <ul className="text-sm space-y-1">
              <li>✓ Tooltips use React Portal (renders at body level)</li>
              <li>✓ Z-index: 99999 (very high)</li>
              <li>✓ Default delay: 300ms</li>
              <li>✓ Position: fixed (viewport-based)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}