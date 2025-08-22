'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface BookContext {
  bookId?: string;
  bookTitle?: string;
  currentChapter?: string;
  currentCFI?: string;
  currentText?: string;
  currentPage?: number;
  totalPages?: number;
  // 0–100 percent (whole or fractional), independent from page counts
  progressPercent?: number;
}

interface Annotation {
  id: string;
  type: 'highlight' | 'note' | 'bookmark';
  text?: string;
  note?: string;
  cfiRange?: string;
  color?: string;
  createdAt?: Date;
}

interface AIContextType {
  bookContext: BookContext;
  annotations: Annotation[];
  selectedAnnotations: Annotation[];
  updateBookContext: (context: Partial<BookContext>) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  toggleAnnotationSelection: (annotation: Annotation) => void;
  clearSelectedAnnotations: () => void;
  getContextForAI: () => string;
}

const AIContext = createContext<AIContextType | null>(null);

export function AIContextProvider({ children }: { children: React.ReactNode }) {
  const [bookContext, setBookContext] = useState<BookContext>({});
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotations, setSelectedAnnotations] = useState<Annotation[]>([]);

  const updateBookContext = useCallback((context: Partial<BookContext>) => {
    setBookContext(prev => ({ ...prev, ...context }));
  }, []);

  const toggleAnnotationSelection = useCallback((annotation: Annotation) => {
    setSelectedAnnotations(prev => {
      const isSelected = prev.some(a => a.id === annotation.id);
      if (isSelected) {
        return prev.filter(a => a.id !== annotation.id);
      }
      return [...prev, annotation];
    });
  }, []);

  const clearSelectedAnnotations = useCallback(() => {
    setSelectedAnnotations([]);
  }, []);

  const getContextForAI = useCallback(() => {
    const contextParts: string[] = [];

    // Add book context
    if (bookContext.bookTitle) {
      contextParts.push(`Book: "${bookContext.bookTitle}"`);
    }
    if (bookContext.currentChapter) {
      contextParts.push(`Current Chapter: "${bookContext.currentChapter}"`);
    }
    // Only show page info if we have real page numbers, not percentage disguised as pages
    if (bookContext.currentPage != null && bookContext.totalPages != null && bookContext.totalPages !== 100) {
      contextParts.push(`Page: ${bookContext.currentPage} of ${bookContext.totalPages}`);
    }
    if (bookContext.progressPercent != null) {
      const pct = Math.round(bookContext.progressPercent);
      contextParts.push(`Progress: ${pct}%`);
    }
    if (bookContext.currentText) {
      const truncatedText = bookContext.currentText.length > 1000 
        ? bookContext.currentText.substring(0, 1000) + '...'
        : bookContext.currentText;
      contextParts.push(`Current visible text:\n"${truncatedText}"`);
    }

    // Add selected annotations
    if (selectedAnnotations.length > 0) {
      contextParts.push('\nSelected Annotations:');
      selectedAnnotations.forEach((annotation, index) => {
        const parts = [`${index + 1}. ${annotation.type}`];
        if (annotation.text) {
          parts.push(`Text: "${annotation.text}"`);
        }
        if (annotation.note) {
          parts.push(`Note: "${annotation.note}"`);
        }
        contextParts.push(parts.join(' - '));
      });
    }

    return contextParts.join('\n');
  }, [bookContext, selectedAnnotations]);

  return (
    <AIContext.Provider
      value={{
        bookContext,
        annotations,
        selectedAnnotations,
        updateBookContext,
        setAnnotations,
        toggleAnnotationSelection,
        clearSelectedAnnotations,
        getContextForAI,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAIContext must be used within an AIContextProvider');
  }
  return context;
}