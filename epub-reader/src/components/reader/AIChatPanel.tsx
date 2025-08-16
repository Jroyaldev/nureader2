"use client";

import { XMarkIcon, SparklesIcon, PaperAirplaneIcon, DocumentTextIcon, HashtagIcon, LightBulbIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { mockChatCompletionStream } from '@/lib/mock-ai-api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: ContextItem[];
}

interface ContextItem {
  id: string;
  type: 'location' | 'selection' | 'highlight' | 'note' | 'bookmark';
  label: string;
  content: string;
  metadata?: {
    chapter?: string;
    location?: string;
    color?: string;
    createdAt?: Date;
  };
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle?: string | undefined;
  currentChapter?: string;
  currentLocation?: string;
  selectedText?: string;
  bookId?: string;
  userId?: string;
  isMobile?: boolean;
  theme?: 'light' | 'dark';
}

// Sophisticated muted colors matching highlight palette
const QUICK_ACTIONS = [
  { 
    id: 'summarize', 
    label: 'Summarize', 
    icon: DocumentTextIcon, 
    prompt: 'Please summarize this section',
    color: 'rgba(251, 191, 36, 0.15)', // Muted amber
    borderColor: 'rgba(251, 191, 36, 0.3)'
  },
  { 
    id: 'explain', 
    label: 'Explain', 
    icon: LightBulbIcon, 
    prompt: 'Explain this passage in simple terms',
    color: 'rgba(34, 197, 94, 0.15)', // Muted green
    borderColor: 'rgba(34, 197, 94, 0.3)'
  },
  { 
    id: 'insights', 
    label: 'Insights', 
    icon: AcademicCapIcon, 
    prompt: 'What are the key insights here?',
    color: 'rgba(96, 165, 250, 0.15)', // Muted blue
    borderColor: 'rgba(96, 165, 250, 0.3)'
  },
  { 
    id: 'define', 
    label: 'Define', 
    icon: HashtagIcon, 
    prompt: 'Define the key terms and concepts',
    color: 'rgba(239, 68, 68, 0.15)', // Muted red
    borderColor: 'rgba(239, 68, 68, 0.3)'
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize context with current location
  useEffect(() => {
    if (isOpen && bookTitle && currentChapter) {
      const locationContext: ContextItem = {
        id: 'location',
        type: 'location',
        label: currentChapter,
        content: `${bookTitle} - ${currentChapter}`,
        metadata: {
          chapter: currentChapter,
          ...(currentLocation ? { location: currentLocation } : {})
        }
      };
      setContextItems([locationContext]);
    }
  }, [isOpen, bookTitle, currentChapter, currentLocation]);
  
  // Add selected text as context
  useEffect(() => {
    if (selectedText && isOpen) {
      const selectionContext: ContextItem = {
        id: 'selection-' + Date.now(),
        type: 'selection',
        label: 'Selected',
        content: selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : ''),
        metadata: {}
      };
      setContextItems(prev => [...prev.filter(c => c.type !== 'selection'), selectionContext]);
    }
  }, [selectedText, isOpen]);
  
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
  
  const removeContextItem = useCallback((id: string) => {
    setContextItems(prev => prev.filter(item => item.id !== id));
  }, []);
  
  // addContextItem helper removed until needed to avoid unused/any lints
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      context: contextItems
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);
    
    // Create assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    
    // Stream response
    try {
      let fullContent = '';
      const stream = mockChatCompletionStream({
        messages: [...messages, userMessage].map(m => ({
          role: m.role,
          content: m.content
        })),
        context: contextItems
      });
      
      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(m => 
          m.id === assistantMessage.id 
            ? { ...m, content: fullContent }
            : m
        ));
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsStreaming(false);
    }
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
      <div className={`
        fixed inset-0 z-[90] 
        ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}
      `}>
        {/* Minimal backdrop */}
        <div className={`
          absolute inset-0 transition-all duration-500
          ${isOpen ? 'opacity-100' : 'opacity-0'}
        `}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-2xl" />
        </div>
        
        {/* Mobile panel */}
        <div className={`
          absolute inset-x-0 bottom-0 top-[10vh]
          transition-all duration-500 transform
          ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        `}>
          <div className="h-full flex flex-col bg-[rgb(var(--bg))]/95 backdrop-blur-2xl rounded-t-3xl shadow-2xl">
            {/* Minimal header */}
            <div className="shrink-0 px-6 py-5 border-b border-[rgba(var(--border),0.08)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[rgb(var(--fg))] flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-[rgb(var(--bg))]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">AI Assistant</h3>
                    {bookTitle && (
                      <p className="text-xs text-muted opacity-70 truncate max-w-[200px]">
                        {bookTitle}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-[rgba(var(--muted),0.08)] transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Context bar */}
            {contextItems.length > 0 && (
              <div className="shrink-0 px-6 py-3 border-b border-[rgba(var(--border),0.08)]">
                <div className="flex flex-wrap gap-2">
                  {contextItems.map(item => (
                    <div
                      key={item.id}
                      className={`
                        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                        ${item.type === 'location' 
                          ? 'bg-black text-white dark:bg-black dark:text-white' 
                          : 'bg-[rgba(var(--muted),0.08)] text-muted hover:bg-[rgba(var(--muted),0.12)]'
                        }
                        transition-colors
                      `}
                    >
                      <span className="max-w-[140px] truncate">{item.label}</span>
                      {item.type !== 'location' && (
                        <button
                          onClick={() => removeContextItem(item.id)}
                          className="hover:opacity-60 transition-opacity"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Messages / Quick actions */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="w-14 h-14 rounded-2xl bg-[rgba(var(--muted),0.08)] flex items-center justify-center mb-5">
                    <SparklesIcon className="w-7 h-7 text-[rgb(var(--muted))]" />
                  </div>
                  <h4 className="text-base font-semibold mb-2">How can I help?</h4>
                  <p className="text-sm text-muted text-center mb-5 max-w-[260px]">
                    Ask questions about the text or request analysis.
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {QUICK_ACTIONS.map(action => (
                      <button
                        key={action.id}
                        onClick={() => setInputValue(action.prompt)}
                        className="group relative p-3 rounded-xl border transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: action.color, borderColor: action.borderColor }}
                      >
                        <div className="flex items-center gap-2">
                          <action.icon className="w-4 h-4 text-[rgb(var(--fg))]" />
                          <span className="text-xs font-medium">{action.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : ''}`}>
                        <div className={`
                          px-4 py-2.5 rounded-2xl text-sm
                          ${message.role === 'user'
                            ? 'bg-[rgb(var(--fg))] dark:bg-white text-[rgb(var(--bg))] dark:text-black'
                            : 'bg-[rgba(var(--muted),0.08)] text-foreground'
                          }
                        `}>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <p className={`
                          text-[10px] text-muted mt-1 px-1 opacity-50
                          ${message.role === 'user' ? 'text-right' : ''}
                        `}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isStreaming && (
                    <div className="flex justify-start">
                      <div className="px-4 py-2.5 bg-[rgba(var(--muted),0.08)] rounded-2xl">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-[rgb(var(--muted))] rounded-full animate-pulse" />
                          <span className="w-1.5 h-1.5 bg-[rgb(var(--muted))] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <span className="w-1.5 h-1.5 bg-[rgb(var(--muted))] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {/* Input area */}
            <div className="shrink-0 p-4 border-t border-[rgba(var(--border),0.08)]">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about this text..."
                  disabled={isStreaming}
                  className="w-full px-4 py-3 pr-12 bg-[rgba(var(--muted),0.05)] border border-[rgba(var(--border),0.08)] rounded-2xl resize-none focus:outline-none focus:border-[rgba(var(--border),0.15)] transition-all text-sm placeholder:text-muted/50"
                  rows={2}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isStreaming}
                  className={`
                    absolute bottom-3 right-3 p-2 rounded-xl transition-all
                    ${inputValue.trim() && !isStreaming
                      ? 'bg-[rgb(var(--fg))] dark:bg-white text-[rgb(var(--bg))] dark:text-black'
                      : 'bg-[rgba(var(--muted),0.1)] text-muted cursor-not-allowed'
                    }
                  `}
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </button>
              </div>
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
      <div className="reader-floating no-top-glint rounded-2xl flex flex-col h-full">
        {/* Minimal header */}
        <div className="shrink-0 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgb(var(--fg))] dark:bg-white flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-[rgb(var(--bg))] dark:text-black" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground tracking-tight">AI Assistant</h2>
                {bookTitle && (
                  <p className="text-xs text-muted font-medium truncate max-w-[200px]">
                    {bookTitle}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg hover:bg-[rgba(var(--muted),0.1)] transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Minimal context bar */}
          {contextItems.length > 0 && (
            <div className="px-6 pb-4">
              <div className="flex flex-wrap gap-2">
                {contextItems.map(item => (
                  <div
                    key={item.id}
                    className={`
                      inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                      ${item.type === 'location' 
                        ? 'bg-black text-white dark:bg-black dark:text-white' 
                        : 'bg-[rgba(var(--muted),0.08)] text-muted hover:bg-[rgba(var(--muted),0.12)]'
                      }
                      transition-colors
                    `}
                  >
                    <span className="max-w-[120px] truncate">{item.label}</span>
                    {item.type !== 'location' && (
                      <button
                        onClick={() => removeContextItem(item.id)}
                        className="hover:opacity-60 transition-opacity"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Messages area - clean and minimal */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-6">
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
              
              {/* Elegant quick actions with muted colors */}
              <div className="grid grid-cols-2 gap-2 w-full">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => setInputValue(action.prompt)}
                    className="group relative p-3 rounded-xl border transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: action.color,
                      borderColor: action.borderColor
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <action.icon className="w-4 h-4 text-[rgb(var(--fg))]" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : ''}`}>
                    <div className={`
                      px-4 py-2.5 rounded-2xl text-sm
                      ${message.role === 'user'
                        ? 'bg-[rgb(var(--fg))] dark:bg-white text-[rgb(var(--bg))] dark:text-black'
                        : 'bg-[rgba(var(--muted),0.08)] text-foreground'
                      }
                    `}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className={`
                      text-[10px] text-muted mt-1 px-1 opacity-50
                      ${message.role === 'user' ? 'text-right' : ''}
                    `}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 bg-[rgba(var(--muted),0.08)] rounded-2xl">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[rgb(var(--muted))] rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-[rgb(var(--muted))] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-1.5 h-1.5 bg-[rgb(var(--muted))] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Clean input area */}
        <div className="shrink-0 border-t border-black/5 dark:border-white/5 p-4">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about this text..."
              disabled={isStreaming}
              className="w-full px-4 py-3 pr-12 bg-[rgba(var(--muted),0.05)] border border-[rgba(var(--border),0.08)] rounded-xl resize-none focus:outline-none focus:border-[rgba(var(--border),0.2)] transition-all duration-200 text-sm placeholder:text-muted/50"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
              className={`
                absolute bottom-3 right-3 p-2 rounded-lg transition-all duration-200
                ${inputValue.trim() && !isStreaming
                  ? 'bg-[rgb(var(--fg))] dark:bg-white text-[rgb(var(--bg))] dark:text-black hover:opacity-90'
                  : 'bg-[rgba(var(--muted),0.08)] text-muted cursor-not-allowed'
                }
              `}
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-center mt-3 text-[10px] text-muted opacity-50">
            <span>⌘J to close</span>
            <span className="mx-2">·</span>
            <span>Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}