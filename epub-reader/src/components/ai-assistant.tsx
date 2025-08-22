'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAIContext } from '@/lib/ai-context';
import { X, Send, Sparkles, ChevronDown, Plus, BookOpen, Highlighter, Brain } from 'lucide-react';

// Enhanced model definitions - OpenAI GPT-5 series and Groq OSS models
type AIModel = 
  | 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1'  // OpenAI
  | 'openai/gpt-oss-120b' | 'openai/gpt-oss-20b';      // Groq OSS

const MODEL_DISPLAY_NAMES: Record<AIModel, string> = {
  // OpenAI Models
  'gpt-5': 'GPT-5',
  'gpt-5-mini': 'GPT-5 Mini',
  'gpt-5-nano': 'GPT-5 Nano',
  'gpt-4.1': 'GPT-4.1',
  // Groq OSS Models
  'openai/gpt-oss-120b': 'GPT-OSS 120B',
  'openai/gpt-oss-20b': 'GPT-OSS 20B',
};

const MODEL_DESCRIPTIONS: Record<AIModel, string> = {
  // OpenAI Models
  'gpt-5': 'Most capable, multimodal understanding',
  'gpt-5-mini': 'Fast and efficient, balanced performance',
  'gpt-5-nano': 'Lightweight, quick responses',
  'gpt-4.1': 'Enhanced GPT-4 with improved capabilities',
  // Groq OSS Models
  'openai/gpt-oss-120b': 'Ultra-fast streaming, web search, reasoning',
  'openai/gpt-oss-20b': 'Cost-efficient, fast inference, tool calling',
};

const MODEL_FEATURES: Record<AIModel, { streaming: boolean; webSearch: boolean; reasoning: boolean; provider: 'openai' | 'groq' }> = {
  // OpenAI Models
  'gpt-5': { streaming: false, webSearch: false, reasoning: true, provider: 'openai' },
  'gpt-5-mini': { streaming: false, webSearch: false, reasoning: true, provider: 'openai' },
  'gpt-5-nano': { streaming: false, webSearch: false, reasoning: true, provider: 'openai' },
  'gpt-4.1': { streaming: false, webSearch: false, reasoning: true, provider: 'openai' },
  // Groq OSS Models
  'openai/gpt-oss-120b': { streaming: true, webSearch: true, reasoning: true, provider: 'groq' },
  'openai/gpt-oss-20b': { streaming: true, webSearch: true, reasoning: true, provider: 'groq' },
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: AIModel;
  context?: string;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>('openai/gpt-oss-20b');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [contextIncluded, setContextIncluded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { 
    bookContext, 
    selectedAnnotations, 
    getContextForAI,
    clearSelectedAnnotations 
  } = useAIContext();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };

    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelDropdownOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: input,
        timestamp: new Date(),
        ...(contextIncluded && { context: getContextForAI() }),
      };

      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      const selectedModelFeatures = MODEL_FEATURES[selectedModel];
      const useStreaming = selectedModelFeatures.streaming;

      try {
        if (useStreaming) {
          // Streaming implementation for Groq models
          const response = await fetch('/api/ai-chat-stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [...messages, userMessage].map(m => ({
                role: m.role,
                content: m.context ? `${m.content}\n\n[Context:\n${m.context}]` : m.content,
              })),
              model: selectedModel,
              context: {
                ...bookContext,
                selectedAnnotations: selectedAnnotations.length > 0 ? selectedAnnotations : undefined,
              },
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to get AI response');
          }

          // Handle streaming response
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response stream');

          let streamingMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            model: selectedModel,
          };

          setMessages(prev => [...prev, streamingMessage]);

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataLine = line.slice(6); // Remove 'data: ' prefix
                if (dataLine === '[DONE]') break;
                
                try {
                  const data = JSON.parse(dataLine);
                  if (data.type === 'text-delta') {
                    streamingMessage.content += data.delta;
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === streamingMessage.id 
                          ? { ...msg, content: streamingMessage.content }
                          : msg
                      )
                    );
                  }
                } catch (e) {
                  // Ignore malformed JSON
                }
              }
            }
          }
        } else {
          // Non-streaming implementation for OpenAI models
          const response = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [...messages, userMessage].map(m => ({
                role: m.role,
                content: m.context ? `${m.content}\n\n[Context:\n${m.context}]` : m.content,
              })),
              model: selectedModel,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to get AI response');
          }

          const data = await response.json();
          
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: data.content,
            timestamp: new Date(),
            model: selectedModel,
          };

          setMessages(prev => [...prev, assistantMessage]);
        }
      } catch (error) {
        console.error('Error getting AI response:', error);
        // Add error message
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          timestamp: new Date(),
        }]);
      } finally {
        setIsLoading(false);
        if (contextIncluded) {
          clearSelectedAnnotations();
          setContextIncluded(false);
        }
      }
    }
  };

  const includeContext = () => {
    setContextIncluded(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Chat Panel */}
      <div className="relative h-full w-full md:max-w-md flex flex-col bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 backdrop-blur-xl md:border-l border-t md:border-t-0 border-zinc-800/50 shadow-2xl overflow-visible">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-green-500" />
            <h2 className="text-base md:text-lg font-semibold text-zinc-100">AI Reading Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Model Selector */}
        <div className="p-3 md:p-4 border-b border-zinc-800/50 relative overflow-visible">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsModelDropdownOpen(!isModelDropdownOpen);
              }}
              className="w-full flex flex-col gap-1 px-2 md:px-3 py-2 md:py-2.5 bg-zinc-800/50 hover:bg-zinc-800/70 rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-sm md:text-base text-zinc-200 font-medium">{MODEL_DISPLAY_NAMES[selectedModel]}</span>
                  {MODEL_FEATURES[selectedModel].webSearch && (
                    <span className="text-xs bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-600/30">WEB</span>
                  )}
                  {MODEL_FEATURES[selectedModel].streaming && (
                    <span className="text-xs bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded border border-green-600/30">STREAM</span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
              <span className="text-xs text-zinc-500 text-left">{MODEL_DESCRIPTIONS[selectedModel]}</span>
            </button>
            
            <div className={`absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800/50 rounded-lg shadow-xl transition-all duration-200 ${isModelDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} style={{ zIndex: 10000 }}>
                {Object.entries(MODEL_DISPLAY_NAMES).map(([model, displayName]) => (
                  <button
                    key={model}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedModel(model as AIModel);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-3 text-left hover:bg-zinc-800/50 transition-colors ${
                      selectedModel === model ? 'bg-green-600/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${selectedModel === model ? 'text-green-400' : 'text-zinc-300'}`}>
                          {displayName}
                        </span>
                        {MODEL_FEATURES[model as AIModel].webSearch && (
                          <span className="text-xs bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-600/30">WEB</span>
                        )}
                        {MODEL_FEATURES[model as AIModel].streaming && (
                          <span className="text-xs bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded border border-green-600/30">STREAM</span>
                        )}
                      </div>
                      {selectedModel === model && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 mt-0.5 block">
                      {MODEL_DESCRIPTIONS[model as AIModel]}
                    </span>
                  </button>
                ))}
              </div>
          </div>
        </div>

        {/* Context Info */}
        {(bookContext.bookTitle || selectedAnnotations.length > 0 || bookContext.progressPercent != null) && (
          <div className="px-4 py-2 bg-zinc-800/30 border-b border-zinc-800/50">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <BookOpen className="w-3 h-3" />
              {bookContext.bookTitle && (
                <span className="truncate">{bookContext.bookTitle}</span>
              )}
              {bookContext.progressPercent != null && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{Math.round(bookContext.progressPercent)}%</span>
                </>
              )}
              {selectedAnnotations.length > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-green-400">{selectedAnnotations.length} annotations selected</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 text-sm mb-2">
                Ask me anything about your book, reading, or request help with understanding the content.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="text-zinc-500">Using {MODEL_DISPLAY_NAMES[selectedModel]}</span>
                {MODEL_FEATURES[selectedModel].webSearch && (
                  <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-600/30">WEB SEARCH</span>
                )}
                {MODEL_FEATURES[selectedModel].streaming && (
                  <span className="bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded border border-green-600/30">STREAMING</span>
                )}
              </div>
            </div>
          )}
          
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[90%] md:max-w-[85%]">
                {message.model && message.role === 'assistant' && (
                  <div className="text-xs text-zinc-500 mb-1 px-1">
                    {MODEL_DISPLAY_NAMES[message.model]}
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    message.role === 'user'
                      ? 'bg-green-600/20 text-zinc-100 border border-green-600/30'
                      : 'bg-zinc-800/50 text-zinc-200 border border-zinc-700/50'
                  }`}
                >
                  <div className="prose prose-sm prose-invert max-w-none">
                    {message.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < message.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  {message.context && (
                    <div className="mt-2 pt-2 border-t border-zinc-700/50">
                      <div className="text-xs text-zinc-500 flex items-center gap-1">
                        <Highlighter className="w-3 h-3" />
                        Context included
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800/50 rounded-2xl px-4 py-2.5 border border-zinc-700/50">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 md:p-4 border-t border-zinc-800/50">
          {/* Context Actions */}
          <div className="flex gap-2 mb-3">
            {(bookContext.currentText || selectedAnnotations.length > 0) && !contextIncluded && (
              <button
                onClick={includeContext}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 rounded-lg text-xs text-green-400 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Include Context
              </button>
            )}
            {contextIncluded && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-600/30 rounded-lg text-xs text-green-400">
                <Highlighter className="w-3 h-3" />
                Context Included
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the book or request help..."
              disabled={isLoading}
              className="flex-1 px-3 md:px-4 py-2 md:py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm md:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-green-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5 text-green-400" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}