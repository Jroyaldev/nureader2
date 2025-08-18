"use client";

import {
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  PlusIcon,
  BookmarkIcon,
  HashtagIcon,
  LightBulbIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentTextIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: ContextItem[];
}

interface ContextItem {
  id: string;
  type: 'highlight' | 'note' | 'bookmark' | 'location';
  label: string;
  content: string;
  metadata?: {
    chapter?: string;
    page?: number;
    cfiRange?: string;
  };
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle?: string;
  currentChapter?: string;
  currentLocation?: string;
  selectedText?: string;
  bookId?: string;
  userId?: string;
  isMobile?: boolean;
  theme?: 'light' | 'dark';
}

const getContextIcon = (type: ContextItem['type']) => {
  switch (type) {
    case 'highlight': return HashtagIcon;
    case 'note': return ChatBubbleBottomCenterTextIcon;
    case 'bookmark': return BookmarkIcon;
    case 'location': return MapPinIcon;
    default: return DocumentTextIcon;
  }
};

const QUICK_ACTIONS = [
  { 
    id: 'summarize', 
    label: 'Summarize', 
    icon: DocumentTextIcon, 
    prompt: 'Summarize the key points from this text',
    color: 'rgba(34, 139, 34, 0.15)', // Forest green
    borderColor: 'rgba(34, 139, 34, 0.3)'
  },
  { 
    id: 'analyze', 
    label: 'Analyze', 
    icon: LightBulbIcon, 
    prompt: 'Analyze the themes and literary devices',
    color: 'rgba(34, 139, 34, 0.15)', // Forest green
    borderColor: 'rgba(34, 139, 34, 0.3)'
  },
  { 
    id: 'define', 
    label: 'Define', 
    icon: HashtagIcon, 
    prompt: 'Define the key terms and concepts',
    color: 'rgba(34, 139, 34, 0.15)', // Forest green
    borderColor: 'rgba(34, 139, 34, 0.3)'
  }
];

export default function AIChatPanel({
  isOpen,
  onClose,
  bookTitle,
  currentChapter,
  currentLocation,
  selectedText,
  bookId: _bookId,
  userId: _userId,
  isMobile = false,
  theme: _theme = 'light'
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [availableContext, setAvailableContext] = useState<ContextItem[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize context with current location
  useEffect(() => {
    if (isOpen && bookTitle && currentChapter) {
      const locationContext: ContextItem = {
        id: 'current-location',
        type: 'location',
        label: currentChapter,
        content: `Currently reading: ${currentChapter}`,
        metadata: {
          chapter: currentChapter
        }
      };
      setContextItems([locationContext]);
    }
  }, [isOpen, bookTitle, currentChapter]);

  // Add selected text as context when available
  useEffect(() => {
    if (selectedText && selectedText.length > 10) {
      const textContext: ContextItem = {
        id: 'selected-text',
        type: 'highlight',
        label: selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''),
        content: selectedText,
        metadata: {
          chapter: currentChapter
        }
      };
      
      // Add to available context
      setAvailableContext(prev => {
        const exists = prev.find(item => item.id === 'selected-text');
        if (!exists) {
          return [textContext, ...prev];
        }
        return prev;
      });
    }
  }, [selectedText, currentChapter]);

  // Mock available context - in real app, this would come from annotations API
  useEffect(() => {
    if (isOpen) {
      const mockContext: ContextItem[] = [
        {
          id: 'highlight-1',
          type: 'highlight',
          label: 'Key passage about character development',
          content: 'The protagonist undergoes significant transformation...',
          metadata: { chapter: 'Chapter 3', page: 45 }
        },
        {
          id: 'note-1',
          type: 'note',
          label: 'Important theme observation',
          content: 'This section explores the central theme of identity...',
          metadata: { chapter: 'Chapter 2', page: 23 }
        }
      ];
      setAvailableContext(prev => [...prev, ...mockContext]);
    }
  }, [isOpen]);

  // (Optional) Load reader context if needed in the future
  
  // Auto-scroll to new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input on open
  useEffect(() => {
    if (isOpen && !isMobile) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMobile]);

  // Prevent body scroll on mobile when panel is open
  useEffect(() => {
    if (isMobile && isOpen) {
      // Store original overflow and position
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore body scroll
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobile, isOpen]);
  
  // Keyboard shortcut (Cmd/Ctrl+J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const addContextItem = (item: ContextItem) => {
    setContextItems(prev => {
      const exists = prev.find(existing => existing.id === item.id);
      if (!exists) {
        return [...prev, item];
      }
      return prev;
    });
    setShowContextSelector(false);
  };

  const removeContextItem = (itemId: string) => {
    setContextItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      context: contextItems.length > 0 ? contextItems : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);

    // Mock AI response - replace with actual AI integration
    setTimeout(() => {
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'assistant',
        content: `I understand you're asking about "${inputValue}". Based on the context you've provided, I can help analyze this further. This is a mock response that would be replaced with actual AI integration.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsStreaming(false);
    }, 1500);
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    if (isStreaming) return;
    
    const contextPrompt = contextItems.length > 0 
      ? `Context: ${contextItems.map(item => item.content).join('; ')}\n\n${action.prompt}`
      : action.prompt;
    
    setInputValue(contextPrompt);
    setTimeout(() => handleSend(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  // Mobile full-screen design - elegant and minimal
  if (isMobile) {
    return (
      <div className={`fixed inset-0 z-[90] transition-all duration-500 ${isOpen ? 'visible' : 'invisible'}`}>
        {/* Enhanced Backdrop - Cleaner, less gray */}
        <div 
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-all duration-500 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        
        {/* Enhanced Bottom Sheet with Glassmorphism - Matches TableOfContents */}
        <div className={`
          unified-panel unified-panel--bottomSheet
          absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out
          max-h-[85vh] flex flex-col safe-area-pb
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}>
          {/* Enhanced Handle */}
          <div className="flex justify-center pt-4 pb-3">
            <div className="w-12 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded-full" />
          </div>
          
          {/* Enhanced Header */}
          <div className="px-6 pb-4 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(var(--muted),0.1)] dark:bg-[rgba(255,255,255,0.05)] flex items-center justify-center backdrop-blur-sm shadow-md">
                  <SparklesIcon className="w-5 h-5 text-[rgb(var(--accent))]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Assistant</h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Ask questions about your reading</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 -mr-2 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all duration-200 backdrop-blur-sm"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Context bar */}
            <div className="shrink-0 px-6 py-3 border-b border-[rgba(var(--border),0.08)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 font-inter">Context</span>
                <button
                  onClick={() => setShowContextSelector(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-white/30 active:bg-white/40 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20 touch-manipulation font-inter"
                >
                  + Add
                </button>
              </div>
              {contextItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {contextItems.map(item => {
                    const IconComponent = getContextIcon(item.type);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#87a96b] text-white backdrop-blur-sm border border-[#87a96b]/20 rounded-xl text-sm shadow-sm"
                      >
                        <IconComponent className="w-3 h-3" />
                        <span className="max-w-[120px] truncate font-inter">{item.label}</span>
                        {item.type !== 'location' && (
                          <button
                            onClick={() => removeContextItem(item.id)}
                            className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 font-inter">No context selected. Tap Add to include highlights, notes, or bookmarks.</p>
              )}
            </div>
            
            {/* Messages / Quick actions */}
            <div 
              ref={scrollContainerRef} 
              className="flex-1 overflow-y-auto p-4"
              style={{
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="w-16 h-16 rounded-xl bg-[rgba(var(--muted),0.1)] dark:bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-6 shadow-md">
                    <SparklesIcon className="w-8 h-8 text-[#87a96b]" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2 font-inter">How can I help?</h4>
                  <p className="text-sm text-gray-600 text-center mb-6 max-w-[280px] font-inter">
                    Ask questions about the text or request analysis.
                  </p>
                  
                  {/* Quick action buttons for mobile */}
                  <div className="grid grid-cols-1 gap-3 w-full max-w-[280px]">
                    {QUICK_ACTIONS.map((action) => {
                      const IconComponent = action.icon;
                      return (
                        <button
                          key={action.id}
                          onClick={() => handleQuickAction(action)}
                          disabled={isStreaming}
                          className="flex items-center gap-3 p-4 rounded-xl bg-white/30 active:bg-white/40 border border-white/20 backdrop-blur-sm transition-all duration-200 disabled:opacity-50 touch-manipulation font-inter"
                        >
                          <div className="p-2 rounded-lg bg-[rgba(var(--muted),0.1)] dark:bg-[rgba(255,255,255,0.05)] shrink-0 shadow-sm">
                            <IconComponent className="w-4 h-4 text-[#87a96b]" />
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-medium text-gray-900 block font-inter">{action.label}</span>
                            <span className="text-xs text-gray-600 font-inter">{action.prompt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                          message.type === 'user'
                            ? 'bg-[#87a96b] text-white'
                            : 'bg-white/40 backdrop-blur-sm border border-white/20 text-gray-900'
                        }`}
                      >
                        <p className="text-sm leading-relaxed font-inter">{message.content}</p>
                        {message.context && (
                          <div className="mt-2 pt-2 border-t border-white/20">
                            <span className="text-xs opacity-75 font-inter">
                              With context: {message.context.map(c => c.label).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isStreaming && (
                    <div className="flex justify-start">
                      <div className="bg-white/40 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {/* Context Selector Modal */}
            {showContextSelector && (
              <div className="absolute inset-0 z-10 bg-black/30 backdrop-blur-md flex items-end">
                <div className="w-full bg-white/95 backdrop-blur-xl rounded-t-3xl border-t border-white/20 shadow-2xl max-h-[70vh] flex flex-col">
                 {/* Handle */}
                 <div className="flex justify-center pt-3 pb-2">
                   <div className="w-10 h-1 bg-black/20 dark:bg-white/30 rounded-full" />
                 </div>
                 
                 {/* Header */}
                 <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
                   <h3 className="text-lg font-semibold text-gray-900 font-inter">Add Context</h3>
                   <button
                     onClick={() => setShowContextSelector(false)}
                     className="p-2 rounded-xl bg-white/20 active:bg-white/30 transition-all duration-200 touch-manipulation"
                   >
                     <XMarkIcon className="w-5 h-5 text-gray-700" />
                   </button>
                 </div>
                 
                 {/* Available Context */}
                 <div 
                   className="flex-1 overflow-y-auto px-4 pb-4"
                   style={{
                     overscrollBehavior: 'contain',
                     touchAction: 'pan-y',
                     WebkitOverflowScrolling: 'touch'
                   }}
                 >
                   <div className="space-y-3">
                     {availableContext.map((item) => {
                       const IconComponent = getContextIcon(item.type);
                       const isSelected = contextItems.find(selected => selected.id === item.id);
                       return (
                         <button
                           key={item.id}
                           onClick={() => addContextItem(item)}
                           disabled={isSelected}
                           className={`w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200 backdrop-blur-sm border touch-manipulation ${
                             isSelected 
                               ? 'bg-gray-100/50 border-gray-200/50 opacity-50 cursor-not-allowed'
                               : 'bg-white/20 active:bg-white/30 border-white/20'
                           }`}
                       >
                         <div className="p-2 rounded-lg bg-[rgba(var(--muted),0.1)] dark:bg-[rgba(255,255,255,0.05)] shrink-0 shadow-sm">
                           <IconComponent className="w-4 h-4 text-[#87a96b]" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <span className="font-medium text-gray-900 text-sm font-inter">{item.label}</span>
                             <span className="text-xs text-gray-500 font-inter capitalize">{item.type}</span>
                           </div>
                           <p className="text-sm text-gray-600 line-clamp-2 font-inter">{item.content}</p>
                           {item.metadata?.chapter && (
                             <p className="text-xs text-gray-500 mt-1 font-inter">{item.metadata.chapter}</p>
                           )}
                         </div>
                         {isSelected && (
                           <div className="text-green-600 shrink-0">
                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                               <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                             </svg>
                           </div>
                         )}
                       </button>
                     );
                   })}
                 </div>
               </div>
             </div>
           </div>
         )}
        </div>
          
          {/* Enhanced Input Area */}
          <div className="shrink-0 border-t border-gray-200/30 dark:border-gray-700/30 p-4">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about this text..."
                disabled={isStreaming}
                className="w-full px-4 py-3 pr-12 bg-white/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#87a96b]/20 focus:border-[#87a96b]/30 text-sm placeholder:text-gray-500"
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isStreaming}
                className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all duration-200 ${
                  inputValue.trim() && !isStreaming
                    ? 'bg-[#87a96b] hover:bg-[##6b8e5a] text-white touch-manipulation'
                    : 'bg-gray-400/20 text-gray-400 cursor-not-allowed'
                }`}
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-center mt-3 text-xs text-gray-500 opacity-50">
              <span>⌘J to close</span>
              <span className="mx-2">·</span>
              <span>Enter to send</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Desktop elegant sidebar - matching homepage aesthetic
  return (
    <div className={`
      fixed right-6 top-1/2 -translate-y-1/2 z-[85] w-[420px] h-[min(680px,85vh)]
      transition-all duration-500 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}
    `}>
      {/* Elegant glass panel matching homepage */}
      <div className="unified-panel reader-floating flex flex-col h-full">
        {/* Enhanced header with glassmorphism */}
        <div className="shrink-0 modal-header">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgb(var(--fg))] dark:bg-white flex items-center justify-center backdrop-blur-sm border border-white/20">
                <SparklesIcon className="w-5 h-5 text-[rgb(var(--bg))] dark:text-black" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground tracking-tight font-inter">AI Assistant</h2>
                {bookTitle && (
                  <p className="text-xs text-muted font-medium truncate max-w-[200px]">
                    {bookTitle}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg active:bg-[rgba(var(--muted),0.1)] transition-colors backdrop-blur-sm border border-white/20 touch-manipulation"
              aria-label="Close"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Enhanced context bar with glassmorphism */}
          {contextItems.length > 0 && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-[rgba(var(--muted),0.1)] dark:bg-[rgba(255,255,255,0.05)] backdrop-blur-sm shadow-sm">
                  <BookmarkIcon className="w-3 h-3 text-[#87a96b]" />
                </div>
                <span className="text-sm font-medium text-muted font-inter">Context</span>
                <button
                  onClick={() => setShowContextSelector(true)}
                  className="ml-auto p-1.5 rounded-lg bg-white/20 active:bg-white/30 transition-all duration-200 backdrop-blur-sm border border-white/20 touch-manipulation"
                >
                  <PlusIcon className="w-3 h-3 text-gray-700" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {contextItems.map(item => {
                  const IconComponent = getContextIcon(item.type);
                  return (
                    <div
                      key={item.id}
                      className={`
                        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                        ${item.type === 'location' 
                          ? 'bg-black text-white dark:bg-black dark:text-white' 
                          : 'bg-white/20 backdrop-blur-sm border border-white/20 text-muted active:bg-white/30 touch-manipulation'
                        }
                        transition-colors
                      `}
                    >
                      <IconComponent className="w-3 h-3 text-[#87a96b]" />
                      <span className="max-w-[120px] truncate font-inter">{item.label}</span>
                      {item.type !== 'location' && (
                        <button
                          onClick={() => removeContextItem(item.id)}
                          className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Messages area - clean and minimal */}
        <div 
          ref={scrollContainerRef} 
          className="flex-1 overflow-y-auto px-6 py-6"
          style={{
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              {/* Simple icon */}
              <div className="w-16 h-16 rounded-2xl bg-[rgba(var(--muted),0.08)] flex items-center justify-center mb-6">
                <SparklesIcon className="w-8 h-8 text-[rgb(var(--muted))]" />
              </div>
              
              <h4 className="text-base font-semibold mb-2">How can I help?</h4>
              <p className="text-sm text-muted text-center mb-6 max-w-[280px]">
                Ask questions about the text or request analysis.
              </p>
              
              {/* Compact action buttons */}
              <div className="flex flex-col gap-2 w-full">
                {QUICK_ACTIONS.map((action) => {
                  const IconComponent = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      disabled={isStreaming}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200 disabled:opacity-50 text-left font-inter"
                    >
                      <div className="p-1.5 rounded-lg bg-[rgba(var(--muted),0.1)] dark:bg-[rgba(255,255,255,0.05)] shrink-0">
                        <IconComponent className="w-3.5 h-3.5 text-[#87a96b]" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-[#87a96b] text-white'
                        : 'bg-white/40 backdrop-blur-sm border border-white/20 text-foreground'
                    }`}
                  >
                    <p className="text-sm leading-relaxed font-inter">{message.content}</p>
                    {message.context && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <span className="text-xs opacity-75 font-inter">
                          With context: {message.context.map(c => c.label).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-white/40 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-muted rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-muted rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-muted rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Enhanced input area with glassmorphism */}
        <div className="shrink-0 border-t border-white/20 bg-gradient-to-r from-white/5 to-white/10 p-4">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about this text..."
              disabled={isStreaming}
              className="w-full px-4 py-3 pr-12 modal-input rounded-xl resize-none focus:outline-none text-sm placeholder:text-gray-500 font-inter"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
              className={`
                absolute bottom-3 right-3 p-2 rounded-lg transition-all duration-200 backdrop-blur-sm border
                ${inputValue.trim() && !isStreaming
                  ? 'bg-[#87a96b] hover:bg-[##6b8e5a] active:bg-[##5a7349] text-white border-[#87a96b]/30 touch-manipulation'
                  : 'bg-gray-400/20 text-gray-400 cursor-not-allowed border-gray-400/20'
                }
              `}
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-center mt-3 text-[10px] text-gray-600 opacity-50 font-inter">
            <span>⌘J to close</span>
            <span className="mx-2">·</span>
            <span>Enter to send</span>
          </div>
        </div>
         
         {/* Context Selector Modal for Desktop */}
         {showContextSelector && (
           <div className="absolute inset-0 z-10 bg-black/30 backdrop-blur-md flex items-center justify-center p-4">
             <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl max-h-[70vh] flex flex-col">
               {/* Header */}
               <div className="flex items-center justify-between p-4 border-b border-white/20">
                 <h3 className="text-lg font-semibold text-gray-900 font-inter">Add Context</h3>
                 <button
                     onClick={() => setShowContextSelector(false)}
                     className="p-2 rounded-xl bg-white/20 active:bg-white/30 transition-all duration-200 backdrop-blur-sm border border-white/20 touch-manipulation"
                   >
                   <XMarkIcon className="w-5 h-5 text-gray-700" />
                 </button>
               </div>
               
               {/* Available Context */}
               <div 
                 className="flex-1 overflow-y-auto p-4"
                 style={{
                   overscrollBehavior: 'contain',
                   touchAction: 'pan-y',
                   WebkitOverflowScrolling: 'touch'
                 }}
               >
                 <div className="space-y-3">
                   {availableContext.map((item) => {
                     const IconComponent = getContextIcon(item.type);
                     const isSelected = contextItems.find(selected => selected.id === item.id);
                     return (
                       <button
                           key={item.id}
                           onClick={() => addContextItem(item)}
                           disabled={isSelected}
                           className={`w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200 backdrop-blur-sm border touch-manipulation ${
                             isSelected 
                               ? 'bg-gray-100/50 border-gray-200/50 opacity-50 cursor-not-allowed'
                               : 'bg-white/20 active:bg-white/30 border-white/20'
                           }`}
                       >
                         <div className="p-2 rounded-lg bg-[rgba(var(--muted),0.1)] dark:bg-[rgba(255,255,255,0.05)] shrink-0 shadow-sm">
                           <IconComponent className="w-4 h-4 text-[#87a96b]" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <span className="font-medium text-gray-900 text-sm font-inter">{item.label}</span>
                             <span className="text-xs text-gray-500 font-inter capitalize">{item.type}</span>
                           </div>
                           <p className="text-sm text-gray-600 line-clamp-2 font-inter">{item.content}</p>
                           {item.metadata?.chapter && (
                             <p className="text-xs text-gray-500 mt-1 font-inter">{item.metadata.chapter}</p>
                           )}
                         </div>
                         {isSelected && (
                           <div className="text-green-600 shrink-0">
                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                               <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                             </svg>
                           </div>
                         )}
                       </button>
                     );
                   })}
                 </div>
               </div>
             </div>
           </div>
         )}
      </div>
    </div>
  );
}