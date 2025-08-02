"use client";

import Tooltip from "@/components/Tooltip";
import TooltipDebug from "@/components/TooltipDebug";
import TooltipFixed from "@/components/TooltipFixed";
import { useState } from "react";

export default function TestTooltipPage() {
  const [tooltipVersion, setTooltipVersion] = useState<'original' | 'debug' | 'fixed'>('original');
  
  const TooltipComponent = 
    tooltipVersion === 'debug' ? TooltipDebug : 
    tooltipVersion === 'fixed' ? TooltipFixed : 
    Tooltip;
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="space-y-8 text-center">
        <h1 className="text-2xl font-bold">Tooltip Test Page</h1>
        
        <div className="flex gap-2 justify-center">
          <button 
            onClick={() => setTooltipVersion('original')}
            className={`px-4 py-2 rounded ${tooltipVersion === 'original' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}
          >
            Original
          </button>
          <button 
            onClick={() => setTooltipVersion('debug')}
            className={`px-4 py-2 rounded ${tooltipVersion === 'debug' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}
          >
            Debug
          </button>
          <button 
            onClick={() => setTooltipVersion('fixed')}
            className={`px-4 py-2 rounded ${tooltipVersion === 'fixed' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}
          >
            Fixed
          </button>
        </div>
        
        <div className="space-y-4">
          <TooltipComponent content="This is a test tooltip">
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Hover me (default position)
            </button>
          </TooltipComponent>
          
          <TooltipComponent content="Top tooltip" position="top">
            <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
              Hover me (top)
            </button>
          </TooltipComponent>
          
          <TooltipComponent content="Left tooltip" position="left">
            <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
              Hover me (left)
            </button>
          </TooltipComponent>
          
          <TooltipComponent content="Right tooltip" position="right">
            <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
              Hover me (right)
            </button>
          </TooltipComponent>
        </div>
        
        <p className="text-sm text-gray-600">
          Open developer tools and check:<br/>
          1. Console for any errors<br/>
          2. Elements panel to see if tooltip divs appear on hover<br/>
          3. Network panel for any failed resource loads<br/>
          4. Click toggle to switch between original and debug tooltip
        </p>
      </div>
    </div>
  );
}