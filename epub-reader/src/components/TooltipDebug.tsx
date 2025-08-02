"use client";

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
}

export default function TooltipDebug({ 
  content, 
  children, 
  delay = 700,
  position = 'bottom',
  disabled = false
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addDebug = (message: string) => {
    console.log(`[Tooltip Debug] ${message}`);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };

  useEffect(() => {
    addDebug(`Tooltip mounted - content: "${content}"`);
    return () => {
      addDebug(`Tooltip unmounting`);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content]);

  const showTooltip = () => {
    addDebug(`showTooltip called - disabled: ${disabled}`);
    if (disabled) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      addDebug(`Setting isVisible to true after ${delay}ms delay`);
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    addDebug(`hideTooltip called`);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const childWithProps = React.cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      addDebug(`Mouse enter event`);
      showTooltip();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      addDebug(`Mouse leave event`);
      hideTooltip();
      children.props.onMouseLeave?.(e);
    },
  });

  return (
    <div className="relative inline-block">
      {childWithProps}
      
      {isVisible && (
        <div
          className={`absolute z-[10100] px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-50 dark:text-gray-900 rounded-md shadow-md border border-gray-200 dark:border-gray-800 whitespace-nowrap pointer-events-none ${
            position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' :
            position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' :
            position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' :
            'left-full top-1/2 -translate-y-1/2 ml-2'
          }`}
        >
          {content}
          <div className="text-[10px] mt-1 opacity-50">
            visible: {isVisible.toString()}
          </div>
        </div>
      )}
      
      {/* Debug panel */}
      <div className="fixed bottom-4 right-4 w-96 max-h-48 overflow-y-auto bg-black/90 text-green-400 text-xs font-mono p-2 rounded z-[10200]">
        <div className="font-bold mb-1">Tooltip Debug Log:</div>
        {debugInfo.slice(-10).map((info, i) => (
          <div key={i}>{info}</div>
        ))}
      </div>
    </div>
  );
}