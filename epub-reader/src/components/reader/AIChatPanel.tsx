"use client";

import { XMarkIcon, SparklesIcon, PaperAirplaneIcon, DocumentTextIcon, HashtagIcon, LightBulbIcon, AcademicCapIcon, PlusIcon, BookmarkIcon, PencilIcon } from '@heroicons/react/24/outline';
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
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [availableContext, setAvailableContext] = useState<ContextItem[]>([]);
  
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
      
      // Initialize available context with mock data
      const mockAvailableContext: ContextItem[] = [
        {
          id: 'highlight-1',
          type: 'highlight',
          label: 'Key Concept',
          content: 'The fundamental principle of quantum mechanics states that...',
          metadata: {
            chapter: 'Chapter 3',
            color: 'yellow',
            createdAt: new Date(Date.now() - 86400000)
          }
        },
        {
          id: 'note-1',
          type: 'note',
          label: 'Personal Insight',
          content: 'This reminds me of the discussion about consciousness in...',
          metadata: {
            chapter: 'Chapter 2',
            createdAt: new Date(Date.now() - 172800000)
          }
        },
        {
          id: 'bookmark-1',
          type: 'bookmark',
          label: 'Important Section',
          content: 'The author\'s main argument about artificial intelligence...',
          metadata: {
            chapter: 'Chapter 1',
            createdAt: new Date(Date.now() - 259200000)
          }
        }
      ];
      setAvailableContext(mockAvailableContext);
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
  
  const addContextItem = (item: ContextItem) => {
    if (!contextItems.find(existing => existing.id === item.id)) {
      setContextItems(prev => [...prev, item]);
    }
    setShowContextSelector(false);
  };

  const getContextIcon = (type: string) => {
    switch (type) {
      case 'highlight': return PencilIcon;
      case 'note': return DocumentTextIcon;
      case 'bookmark': return BookmarkIcon;
      case 'location': return HashtagIcon;
      default: return DocumentTextIcon;
    }
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
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/30 backdrop-blur-md"
          onClick={onClose}
        />
        
        {/* Panel */}
        <div className={`absolute inset-0 modal-glass transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'} border-t`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 modal-header">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/20">
                <SparklesIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 font-inter">AI Assistant</h2>
                <p className="text-sm text-gray-600 font-inter">Ask questions about your reading</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 active:bg-white/30 transition-all duration-200 backdrop-blur-sm border border-white/20 touch-manipulation"
            >
              <XMarkIcon className="w-5 h-5 text-gray-700" />
            </button>
          </div>

            {/* Context bar */}
            <div className="shrink-0 px-6 py-3 border-b border-[rgba(var(--border),0.08)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 font-inter">Context</span>
                <button
                  onClick={() => setShowContextSelector(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 active:bg-white/30 transition-all duration-200 backdrop-blur-sm border border-white/20 touch-manipulation"
                >
                  <PlusIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-600 font-inter">Add</span>
                </button>
              </div>
              {contextItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {contextItems.map((item) => {
                    const IconComponent = getContextIcon(item.type);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-white/20 rounded-xl text-sm"
                      >
                        <IconComponent className="w-3 h-3 text-blue-600" />
                        <span className="truncate max-w-[120px] text-gray-700 font-inter">{item.label}</span>
                        <button
                          onClick={() => removeContextItem(item.id)}
                          className="p-1.5 rounded-full active:bg-white/30 transition-all duration-200 touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
                        >
                          <XMarkIcon className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 font-inter">No context selected. Tap Add to include highlights, notes, or bookmarks.</p>
              )}
            </div>
            
            {/* Messages / Quick actions */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-6">
                    <SparklesIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2 font-inter">How can I help?</h4>
                  <p className="text-sm text-gray-600 text-center mb-6 max-w-[280px] font-inter">
                    Ask questions about the text or request analysis.
                  </p>
                  <div className="w-full max-w-sm space-y-3">
                    {QUICK_ACTIONS.map(action => (
                      <button
                        key={action.id}
                        onClick={() => setInputValue(action.prompt)}
                        className="w-full flex items-center gap-3 p-4 bg-white/20 active:bg-white/30 rounded-2xl transition-all duration-200 text-left backdrop-blur-sm border border-white/20 touch-manipulation"
                      >
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                          <action.icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm font-inter">{action.label}</div>
                          <div className="text-xs text-gray-600 font-inter">{action.prompt}</div>
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
                          px-4 py-3 rounded-2xl text-sm backdrop-blur-sm border
                          ${message.role === 'user'
                            ? 'bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white border-blue-400/30'
                            : 'bg-white/30 text-gray-900 border-white/20'
                          }
                        `}>
                          <p className="whitespace-pre-wrap font-inter">{message.content}</p>
                        </div>
                        <p className={`
                          text-[10px] text-gray-600 mt-2 px-1 opacity-70 font-inter
                          ${message.role === 'user' ? 'text-right' : ''}
                        `}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isStreaming && (
                    <div className="flex justify-start">
                      <div className="px-4 py-2.5 bg-white/30 rounded-2xl backdrop-blur-sm border border-white/20">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {/* Input area */}
            <div className="shrink-0 p-4 border-t border-gray-200/20 bg-white/10 backdrop-blur-sm">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about your reading..."
                    className="w-full px-4 py-3 modal-input rounded-2xl resize-none focus:outline-none text-sm placeholder-gray-500 font-inter"
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isStreaming}
                  className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 active:from-blue-600 active:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200 shrink-0 backdrop-blur-sm border border-blue-400/30 disabled:border-gray-400/30 touch-manipulation"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Context Selector Modal */}
            {showContextSelector && (
              <div className="absolute inset-0 z-10 bg-black/30 backdrop-blur-md flex items-end">
                <div className="w-full bg-white/95 backdrop-blur-xl rounded-t-3xl border-t border-white/20 shadow-2xl max-h-[70vh] flex flex-col">
                 {/* Handle */}
                 <div className="flex justify-center py-3">
                   <div className="w-12 h-1 bg-gray-300 rounded-full" />
                 </div>
                 
                 {/* Header */}
                 <div className="flex items-center justify-between px-4 pb-4">
                   <h3 className="text-lg font-semibold text-gray-900 font-inter">Add Context</h3>
                   <button
                     onClick={() => setShowContextSelector(false)}
                     className="p-2 rounded-xl bg-white/20 active:bg-white/30 transition-all duration-200 touch-manipulation"
                   >
                     <XMarkIcon className="w-5 h-5 text-gray-700" />
                   </button>
                 </div>
                 
                 {/* Available Context */}
                 <div className="flex-1 overflow-y-auto px-4 pb-4">
                   <div className="space-y-3">
                     {availableContext.map((item) => {
                       const IconComponent = getContextIcon(item.type);
                       const isSelected = contextItems.find(selected => selected.id === item.id);
                       return (
                         <button
                           key={item.id}
                           onClick={() => addContextItem(item)}
                           disabled={isSelected}
                           className={`w-full flex items-start gap-3 p-4 rounded-2xl text-left transition-all duration-200 backdrop-blur-sm border touch-manipulation ${
                             isSelected 
                               ? 'bg-gray-100/50 border-gray-200/50 opacity-50 cursor-not-allowed'
                               : 'bg-white/20 active:bg-white/30 border-white/20'
                           }`}
                         >
                           <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 shrink-0">
                             <IconComponent className="w-4 h-4 text-blue-600" />
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
  
  // Desktop elegant sidebar - matching homepage aesthetic
  return (
    <div className={`
      fixed right-6 top-1/2 -translate-y-1/2 z-[85] w-[420px] h-[min(680px,85vh)]
      transition-all duration-500 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}
    `}>
      {/* Elegant glass panel matching homepage */}
      <div className="modal-glass rounded-2xl flex flex-col h-full">
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
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/20">
                  <BookmarkIcon className="w-3 h-3 text-blue-600" />
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
                      <IconComponent className="w-3 h-3 text-blue-600" />
                      <span className="max-w-[120px] truncate font-inter">{item.label}</span>
                      {item.type !== 'location' && (
                        <button
                          onClick={() => removeContextItem(item.id)}
                          className="p-1 rounded-full active:bg-white/30 transition-all duration-200 touch-manipulation min-w-[28px] min-h-[28px] flex items-center justify-center"
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
                    className="group relative p-3 rounded-xl border transition-all active:scale-[1.02] touch-manipulation"
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
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 active:from-blue-600 active:to-blue-700 text-white border-blue-400/30 touch-manipulation'
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
               <div className="flex-1 overflow-y-auto p-4">
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
                         <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 shrink-0">
                           <IconComponent className="w-4 h-4 text-blue-600" />
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