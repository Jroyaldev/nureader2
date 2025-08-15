"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  readerAge?: number;
  context?: {
    type: 'bookmark' | 'highlight' | 'note';
    content: string;
    location?: string;
  }[];
}

export interface AIContextItem {
  id: string;
  type: 'bookmark' | 'highlight' | 'note';
  content: string;
  location?: string;
  color?: string;
  chapter?: string;
  selected?: boolean;
}

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle?: string;
  currentChapter?: string;
  bookmarks?: AIContextItem[];
  highlights?: AIContextItem[];
  notes?: AIContextItem[];
  isMobile?: boolean;
  theme?: 'light' | 'dark';
}

export default function AIChatbot({
  isOpen,
  onClose,
  bookTitle,
  currentChapter,
  bookmarks = [],
  highlights = [],
  notes = [],
  isMobile = false,
  theme = 'light'
}: AIChatbotProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedContext, setSelectedContext] = useState<Set<string>>(new Set());
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [activeContextTab, setActiveContextTab] = useState<'all'|'bookmarks'|'highlights'|'notes'>('all');
  const [readerAge, setReaderAge] = useState<number | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMobile) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMobile]);

  const handleContextToggle = useCallback((itemId: string) => {
    setSelectedContext(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const getSelectedContextItems = useCallback((): AIContextItem[] => {
    const allItems = [...bookmarks, ...highlights, ...notes];
    return allItems.filter(item => selectedContext.has(item.id));
  }, [bookmarks, highlights, notes, selectedContext]);

  const simulateAPIResponse = async (message: string, context: AIContextItem[], readerAge?: number): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
    
    // Generate contextual responses
    const responses = [
      "Based on your reading context, I can see you're exploring some fascinating themes in this chapter.",
      "Your highlights suggest you're particularly interested in this concept. Let me elaborate on that...",
      "Looking at your notes, I notice a pattern emerging. Here's my analysis...",
      "That's an excellent question about the text. From what you've bookmarked, I can provide some insights...",
      "I've analyzed the passages you've selected. Here's what stands out..."
    ];
    
    const ageTone = readerAge
      ? readerAge < 12
        ? 'I will keep my explanation simple and friendly.'
        : readerAge < 18
          ? 'I will tailor the explanation for a teen reader.'
          : 'I will provide an adult-oriented analysis.'
      : '';

    if (context.length > 0) {
      return `${responses[Math.floor(Math.random() * responses.length)]} The selected ${context.length} ${context.length === 1 ? 'item' : 'items'} provide valuable context for understanding this section better. ${ageTone}`.trim();
    }

    return `I'm here to help you understand and explore this book. Select highlights, notes, or bookmarks to give me more context. ${ageTone}`.trim();
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      readerAge,
      context: getSelectedContextItems().map(item => ({
        type: item.type,
        content: item.content,
        location: item.location
      }))
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await simulateAPIResponse(inputValue, getSelectedContextItems(), readerAge);
      
      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const contextCounts = {
    bookmarks: bookmarks.length,
    highlights: highlights.length,
    notes: notes.length
  };

  const selectedCount = selectedContext.size;

  const visibleContextItems = useMemo(() => {
    const all = [
      ...(activeContextTab === 'all' || activeContextTab === 'bookmarks' ? bookmarks : []),
      ...(activeContextTab === 'all' || activeContextTab === 'highlights' ? highlights : []),
      ...(activeContextTab === 'all' || activeContextTab === 'notes' ? notes : []),
    ];
    return all;
  }, [activeContextTab, bookmarks, highlights, notes]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
              onClick={onClose}
            />
          )}

          {/* Chat Container */}
          <motion.div
            initial={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
            animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed ${
              isMobile 
                ? 'bottom-0 left-0 right-0 h-[85vh] rounded-t-[24px]'
                : 'right-6 bottom-6 w-[440px] h-[640px] rounded-[20px]'
            } reader-floating z-[75] flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[rgba(var(--border),var(--border-opacity))]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[rgba(var(--accent),0.12)] text-[rgb(var(--accent))] flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[rgb(var(--fg))] tracking-tight">AI Reading Assistant</h3>
                  <p className="text-xs text-[rgb(var(--muted))]">
                    {bookTitle ? `Reading: ${bookTitle}` : 'Ready to help'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-[rgba(var(--muted),0.1)] transition-colors"
                aria-label="Close assistant"
              >
                <svg className="w-5 h-5 text-[rgb(var(--muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Context Selection Bar */}
            <div className="px-4 py-3 border-b border-[rgba(var(--border),var(--border-opacity))] bg-[rgba(var(--muted),0.03)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[rgb(var(--muted))]">Context & Preferences</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[rgb(var(--muted))]">Reader age</span>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={readerAge ?? ''}
                      onChange={(e) => setReaderAge(e.target.value ? Math.max(5, Math.min(100, Number(e.target.value))) : undefined)}
                      placeholder="–"
                      className="w-12 px-2 py-1 text-xs rounded-[8px] bg-[rgba(var(--muted),0.08)] border border-[rgba(var(--border),var(--border-opacity))] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent),0.35)]"
                    />
                  </div>
                  {selectedCount > 0 && (
                    <span className="text-xs font-medium text-[rgb(var(--accent))]">
                      {selectedCount} selected
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => { setActiveContextTab('bookmarks'); setShowContextMenu(true); }}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${
                    contextCounts.bookmarks > 0
                      ? 'bg-[rgba(var(--accent),0.1)] text-[rgb(var(--accent))] hover:bg-[rgba(var(--accent),0.14)]'
                      : 'bg-[rgba(var(--muted),0.1)] text-[rgb(var(--muted))] cursor-not-allowed opacity-50'
                  }`}
                  disabled={contextCounts.bookmarks === 0}
                >
                  📑 Bookmarks ({contextCounts.bookmarks})
                </button>
                <button
                  onClick={() => { setActiveContextTab('highlights'); setShowContextMenu(true); }}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${
                    contextCounts.highlights > 0
                      ? 'bg-[rgba(var(--muted),0.1)] text-[rgb(var(--fg))] hover:bg-[rgba(var(--muted),0.14)]'
                      : 'bg-[rgba(var(--muted),0.1)] text-[rgb(var(--muted))] cursor-not-allowed opacity-50'
                  }`}
                  disabled={contextCounts.highlights === 0}
                >
                  🖍️ Highlights ({contextCounts.highlights})
                </button>
                <button
                  onClick={() => { setActiveContextTab('notes'); setShowContextMenu(true); }}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${
                    contextCounts.notes > 0
                      ? 'bg-[rgba(var(--muted),0.1)] text-[rgb(var(--fg))] hover:bg-[rgba(var(--muted),0.14)]'
                      : 'bg-[rgba(var(--muted),0.1)] text-[rgb(var(--muted))] cursor-not-allowed opacity-50'
                  }`}
                  disabled={contextCounts.notes === 0}
                >
                  📝 Notes ({contextCounts.notes})
                </button>
                <button
                  onClick={() => { setActiveContextTab('all'); setShowContextMenu(true); }}
                  className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all bg-[rgba(var(--muted),0.08)] text-[rgb(var(--fg))] hover:bg-[rgba(var(--muted),0.12)]"
                >
                  All
                </button>
              </div>

              {/* Context Menu Dropdown */}
              <AnimatePresence>
                {showContextMenu && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 overflow-hidden"
                  >
                    <div className="max-h-40 overflow-y-auto rounded-[12px] border border-[rgba(var(--border),var(--border-opacity))] bg-[rgb(var(--bg))]">
                      {visibleContextItems.length === 0 && (
                        <div className="p-3 text-xs text-[rgb(var(--muted))]">No items in this category.</div>
                      )}
                      {visibleContextItems.map(item => (
                        <label
                          key={item.id}
                          className="flex items-start gap-2 p-3 hover:bg-[rgba(var(--muted),0.05)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedContext.has(item.id)}
                            onChange={() => handleContextToggle(item.id)}
                            className="mt-0.5 rounded border-[rgba(var(--border),var(--border-opacity))]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-medium uppercase tracking-wider text-[rgb(var(--muted))]">
                                {item.type}
                              </span>
                              {item.chapter && (
                                <span className="text-[10px] text-[rgb(var(--muted))]">
                                  • {item.chapter}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[rgb(var(--fg))] line-clamp-2">
                              {item.content}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-[16px] bg-[rgba(var(--accent),0.1)] text-[rgb(var(--accent))] flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-[rgb(var(--fg))] mb-2">Welcome to your AI assistant</h4>
                  <p className="text-sm text-[rgb(var(--muted))] max-w-[280px] mx-auto">
                    I can help you understand passages, analyze themes, and explore your reading deeper. Select context to enhance our conversation.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[16px] px-4 py-3 border ${
                      message.role === 'user'
                        ? 'bg-[rgba(var(--accent),0.08)] border-[rgba(var(--accent),0.25)]'
                        : 'bg-[rgba(var(--muted),0.06)] border-[rgba(var(--border),var(--border-opacity))]'
                    }`}
                  >
                    {message.context && message.context.length > 0 && (
                      <div className={`text-xs ${message.role === 'user' ? 'text-[rgb(var(--accent))]' : 'text-[rgb(var(--muted))]'} mb-2`}>
                        With {message.context.length} context {message.context.length === 1 ? 'item' : 'items'}
                      </div>
                    )}
                    {message.readerAge && (
                      <div className="text-[10px] text-[rgb(var(--muted))] mb-1">Reader age: {message.readerAge}</div>
                    )}
                    <p className={`text-sm ${'text-[rgb(var(--fg))]'}`}>
                      {message.content}
                    </p>
                    <div className={`text-[10px] mt-2 ${'text-[rgb(var(--muted))]'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[rgba(var(--muted),0.08)] rounded-[16px] px-4 py-3">
                    <div className="flex gap-1">
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 bg-[rgb(var(--muted))] rounded-full"
                      />
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-[rgb(var(--muted))] rounded-full"
                      />
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-[rgb(var(--muted))] rounded-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[rgba(var(--border),var(--border-opacity))]">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about the book..."
                    rows={1}
                    className="w-full px-4 py-2.5 pr-12 bg-[rgba(var(--muted),0.06)] rounded-[12px] resize-none text-sm text-[rgb(var(--fg))] placeholder-[rgb(var(--muted))] border border-[rgba(var(--border),var(--border-opacity))] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent),0.35)]"
                    style={{ minHeight: '42px', maxHeight: '120px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isTyping}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-[8px] flex items-center justify-center transition-all ${
                      inputValue.trim() && !isTyping
                        ? 'bg-[rgb(var(--accent))] text-white hover:opacity-90'
                        : 'bg-[rgba(var(--muted),0.1)] text-[rgb(var(--muted))] cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating Action Button (Desktop only) */}
          {!isMobile && (
            <motion.button
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={onClose}
              className="fixed right-6 bottom-6 w-14 h-14 rounded-full reader-floating border border-[rgba(var(--border),var(--border-opacity))] flex items-center justify-center hover:opacity-95 transition-opacity z-[74]"
            >
              <svg className="w-6 h-6 text-[rgb(var(--muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          )}
        </>
      )}

      {/* Floating Action Button when closed */}
      {!isOpen && !isMobile && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onClose()}
          className="fixed right-6 bottom-6 w-14 h-14 rounded-full reader-floating border border-[rgba(var(--border),var(--border-opacity))] flex items-center justify-center hover:opacity-95 transition-opacity z-[70]"
        >
          <svg className="w-6 h-6 text-[rgb(var(--accent))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
