"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  XMarkIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  PaintBrushIcon,
  BookmarkIcon,
  ChatBubbleLeftIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  LanguageIcon,
  DocumentTextIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesSolidIcon } from '@heroicons/react/24/solid';
import { mockChatCompletionStream, mockGetReaderContext } from '@/lib/mock-ai-api';

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

const QUICK_ACTIONS = [
  { id: 'summarize', label: 'Summarize', icon: DocumentTextIcon, prompt: 'Please summarize this section' },
  { id: 'explain', label: 'Explain', icon: SparklesIcon, prompt: 'Explain this passage in simple terms' },
  { id: 'define', label: 'Define', icon: HashtagIcon, prompt: 'Define the key terms here' },
  { id: 'translate', label: 'Translate', icon: LanguageIcon, prompt: 'Translate this to ' }
];

const SLASH_COMMANDS = [
  { command: '/summary', description: 'Summarize the current section', icon: DocumentTextIcon },
  { command: '/explain', description: 'Explain in simple terms', icon: SparklesIcon },
  { command: '/define', description: 'Define terms or concepts', icon: HashtagIcon },
  { command: '/translate', description: 'Translate to another language', icon: LanguageIcon }
];

export default function AIChatPanel({
  isOpen,
  onClose,
  bookTitle,
  currentChapter,
  currentLocation,
  selectedText,
  bookId,
  userId,
  isMobile = false,
  theme = 'light'
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [readerContext, setReaderContext] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize context with current location
  useEffect(() => {
    if (isOpen && bookTitle && currentChapter) {
      const locationContext: ContextItem = {
        id: 'location',
        type: 'location',
        label: 'Current Location',
        content: `${bookTitle} - ${currentChapter}`,
        metadata: {
          chapter: currentChapter,
          location: currentLocation
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
        label: 'Selected Text',
        content: selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : ''),
        metadata: {}
      };
      setContextItems(prev => [...prev.filter(c => c.type !== 'selection'), selectionContext]);
    }
  }, [selectedText, isOpen]);
  
  // Load reader context (highlights, notes, bookmarks)
  useEffect(() => {
    if (isOpen && bookId && userId) {
      mockGetReaderContext(bookId, userId).then(setReaderContext);
    }
  }, [isOpen, bookId, userId]);
  
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
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);
  
  // Handle input changes and slash commands
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSlashMenu(value.startsWith('/'));
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
    setShowSlashMenu(false);
    
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
        fullContent += chunk.content;
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: fullContent }
            : msg
        ));
      }
    } finally {
      setIsStreaming(false);
    }
  };
  
  // Add context item
  const addContextItem = (type: 'highlight' | 'note' | 'bookmark', item: any) => {
    const contextItem: ContextItem = {
      id: `${type}-${item.id}`,
      type: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      content: item.text || item.content || `${type} from ${item.chapter || 'Unknown'}`,
      metadata: {
        chapter: item.chapter,
        location: item.location,
        color: item.color,
        createdAt: item.createdAt
      }
    };
    
    setContextItems(prev => {
      const exists = prev.some(c => c.id === contextItem.id);
      return exists ? prev : [...prev, contextItem];
    });
  };
  
  // Remove context item
  const removeContextItem = (id: string) => {
    setContextItems(prev => prev.filter(item => item.id !== id && item.type !== 'location'));
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (isMobile) {
    // Mobile: Bottom sheet design matching TOC
    return (
      <div className={`
        fixed inset-0 z-[90] transition-all duration-300
        ${isOpen ? 'visible' : 'invisible'}
      `}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        
        {/* Bottom Sheet */}
        <div className={`
          absolute bottom-0 left-0 right-0 reader-floating no-top-glint rounded-t-3xl
          transition-transform duration-300 ease-out max-h-[85vh] flex flex-col
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-[rgba(var(--muted),0.3)] rounded-full" />
          </div>
          
          {/* Header */}
          <div className="px-6 pb-4 reader-divider-h">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <SparklesSolidIcon className="w-5 h-5 text-[rgb(var(--accent))]" />
                <h2 className="text-lg font-semibold">AI Assistant</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg hover:bg-[rgba(var(--muted),0.1)]"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Context chips */}
            <div className="flex flex-wrap gap-1.5">
              {contextItems.map(item => (
                <div
                  key={item.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(var(--muted),0.08)] rounded-lg text-xs"
                >
                  <span className="text-[rgb(var(--fg))]">{item.label}</span>
                  {item.type !== 'location' && (
                    <button
                      onClick={() => removeContextItem(item.id)}
                      className="hover:opacity-70"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Messages */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <SparklesIcon className="w-12 h-12 mx-auto mb-3 text-[rgb(var(--accent))]/50" />
                <p className="text-sm text-muted mb-4">How can I help you understand this book?</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.slice(0, 2).map(action => (
                    <button
                      key={action.id}
                      onClick={() => setInputValue(action.prompt)}
                      className="p-2 text-xs bg-[rgba(var(--muted),0.05)] rounded-lg hover:bg-[rgba(var(--muted),0.1)]"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-[rgb(var(--accent))]/10 text-[rgb(var(--fg))]'
                        : 'bg-[rgba(var(--muted),0.08)] text-[rgb(var(--fg))]'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-[10px] text-muted mt-1">{formatTime(message.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 bg-[rgba(var(--muted),0.08)] rounded-2xl">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[rgb(var(--muted))] rounded-full animate-pulse" />
                        <span className="w-2 h-2 bg-[rgb(var(--muted))] rounded-full animate-pulse delay-75" />
                        <span className="w-2 h-2 bg-[rgb(var(--muted))] rounded-full animate-pulse delay-150" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {/* Input */}
          <div className="px-4 py-3 border-t border-[rgba(var(--border),var(--border-opacity))]">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about the text..."
                rows={1}
                className="flex-1 px-3 py-2 bg-[rgba(var(--muted),0.05)] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/20"
                style={{ minHeight: '38px', maxHeight: '100px' }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isStreaming}
                className={`p-2 rounded-lg transition-colors ${
                  inputValue.trim() && !isStreaming
                    ? 'bg-[rgb(var(--accent))] text-white'
                    : 'bg-[rgba(var(--muted),0.1)] text-[rgb(var(--muted))]'
                }`}
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Desktop: Floating sidebar matching TOC/Annotations style
  return (
    <div className={`
      fixed right-6 top-1/2 -translate-y-1/2 z-[85] w-[420px] h-[min(700px,90vh)]
      transition-all duration-500 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}
    `}>
      <div className="reader-floating no-top-glint rounded-2xl flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgb(var(--accent))]/20 to-[rgb(var(--accent))]/10 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-[rgb(var(--accent))]" />
              </div>
              <div>
                <h3 className="text-base font-semibold">AI Assistant</h3>
                {bookTitle && (
                  <p className="text-xs text-muted truncate max-w-[200px]">{bookTitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg hover:bg-[rgba(var(--muted),0.1)] transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Context Bar */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted font-medium">Reading Context</span>
              <button
                onClick={() => setShowContextPicker(!showContextPicker)}
                className="text-[rgb(var(--accent))] hover:opacity-80"
              >
                Add context
              </button>
            </div>
            
            {/* Context chips */}
            <div className="flex flex-wrap gap-1.5">
              {contextItems.map(item => (
                <div
                  key={item.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-[rgba(var(--muted),0.08)] rounded text-xs group"
                >
                  {item.type === 'location' && <BookOpenIcon className="w-3 h-3 text-[rgb(var(--muted))]" />}
                  {item.type === 'selection' && <HashtagIcon className="w-3 h-3 text-[rgb(var(--muted))]" />}
                  {item.type === 'highlight' && <PaintBrushIcon className="w-3 h-3 text-[rgb(var(--accent))]" />}
                  {item.type === 'note' && <ChatBubbleLeftIcon className="w-3 h-3 text-[rgb(var(--muted))]" />}
                  {item.type === 'bookmark' && <BookmarkIcon className="w-3 h-3 text-[rgb(var(--muted))]" />}
                  
                  <span className="text-[rgb(var(--fg))] max-w-[100px] truncate">{item.label}</span>
                  
                  {item.type !== 'location' && (
                    <button
                      onClick={() => removeContextItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="w-3 h-3 text-[rgb(var(--muted))]" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Context Picker */}
            {showContextPicker && readerContext && (
              <div className="mt-2 p-3 bg-[rgba(var(--muted),0.05)] rounded-lg">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    onClick={() => {
                      readerContext.highlights?.slice(0, 3).forEach((h: any) => addContextItem('highlight', h));
                      setShowContextPicker(false);
                    }}
                    className="p-2 rounded hover:bg-[rgba(var(--muted),0.1)] transition-colors"
                  >
                    <PaintBrushIcon className="w-4 h-4 mx-auto mb-1 text-[rgb(var(--accent))]" />
                    <span>{readerContext.highlights?.length || 0} Highlights</span>
                  </button>
                  <button
                    onClick={() => {
                      readerContext.notes?.slice(0, 3).forEach((n: any) => addContextItem('note', n));
                      setShowContextPicker(false);
                    }}
                    className="p-2 rounded hover:bg-[rgba(var(--muted),0.1)] transition-colors"
                  >
                    <ChatBubbleLeftIcon className="w-4 h-4 mx-auto mb-1 text-[rgb(var(--muted))]" />
                    <span>{readerContext.notes?.length || 0} Notes</span>
                  </button>
                  <button
                    onClick={() => {
                      readerContext.bookmarks?.slice(0, 3).forEach((b: any) => addContextItem('bookmark', b));
                      setShowContextPicker(false);
                    }}
                    className="p-2 rounded hover:bg-[rgba(var(--muted),0.1)] transition-colors"
                  >
                    <BookmarkIcon className="w-4 h-4 mx-auto mb-1 text-[rgb(var(--muted))]" />
                    <span>{readerContext.bookmarks?.length || 0} Bookmarks</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Messages Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <SparklesIcon className="w-16 h-16 text-[rgb(var(--accent))]/20 mb-4" />
              <h4 className="text-base font-semibold mb-2">How can I help?</h4>
              <p className="text-sm text-muted text-center mb-6 max-w-[280px]">
                Ask questions about the text, request summaries, or explore themes and concepts.
              </p>
              
              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-[320px]">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => setInputValue(action.prompt)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[rgba(var(--border),var(--border-opacity))] hover:bg-[rgba(var(--muted),0.04)] transition-colors text-left"
                  >
                    <action.icon className="w-4 h-4 text-[rgb(var(--muted))]" />
                    <span className="text-xs">{action.label}</span>
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
                    <div className={`px-3.5 py-2.5 rounded-xl ${
                      message.role === 'user'
                        ? 'bg-[rgb(var(--accent))]/10 border border-[rgb(var(--accent))]/20'
                        : 'bg-[rgba(var(--muted),0.05)] border border-[rgba(var(--border),var(--border-opacity))]'
                    }`}>
                      {message.context && message.context.length > 0 && (
                        <div className="text-[10px] text-[rgb(var(--muted))] mb-1">
                          With {message.context.length} context items
                        </div>
                      )}
                      <p className="text-sm text-[rgb(var(--fg))] whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <p className={`text-[10px] text-muted mt-1 px-1 ${
                      message.role === 'user' ? 'text-right' : ''
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="px-3.5 py-2.5 bg-[rgba(var(--muted),0.05)] rounded-xl">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[rgb(var(--muted))] rounded-full animate-pulse" />
                      <span className="w-2 h-2 bg-[rgb(var(--muted))] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 bg-[rgb(var(--muted))] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Slash menu */}
        {showSlashMenu && inputValue.startsWith('/') && (
          <div className="absolute bottom-[70px] left-6 right-6 bg-[rgb(var(--bg))] rounded-lg border border-[rgba(var(--border),var(--border-opacity))] shadow-lg overflow-hidden">
            {SLASH_COMMANDS.filter(cmd => 
              cmd.command.includes(inputValue.toLowerCase())
            ).map(cmd => (
              <button
                key={cmd.command}
                onClick={() => {
                  setInputValue(cmd.command + ' ');
                  setShowSlashMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[rgba(var(--muted),0.05)] text-left"
              >
                <cmd.icon className="w-4 h-4 text-[rgb(var(--muted))]" />
                <div>
                  <div className="text-sm font-medium">{cmd.command}</div>
                  <div className="text-xs text-muted">{cmd.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {/* Input Area */}
        <div className="shrink-0 px-6 py-4 border-t border-black/5 dark:border-white/5">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about the text or type / for commands..."
              rows={1}
              className="flex-1 px-3 py-2 bg-[rgba(var(--muted),0.05)] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/20 placeholder-muted"
              style={{ minHeight: '38px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
              className={`px-3 py-2 rounded-lg transition-colors ${
                inputValue.trim() && !isStreaming
                  ? 'bg-[rgb(var(--accent))] text-white hover:opacity-90'
                  : 'bg-[rgba(var(--muted),0.1)] text-[rgb(var(--muted))] cursor-not-allowed'
              }`}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}