'use client';

import React, { useEffect, useState } from 'react';
import { AIContextProvider, useAIContext } from '@/lib/ai-context';
import AIAssistant from '@/components/ai-assistant';
import AnnotationSelector from '@/components/annotation-selector';
import { createClient } from '@/utils/supabase/client';
import { Sparkles, MessageSquare } from 'lucide-react';

interface EnhancedAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  bookId?: string;
  bookTitle?: string;
  currentChapter?: string;
  currentCFI?: string;
  currentText?: string;
  currentPage?: number;
  totalPages?: number;
  // Whole or fractional percent (0–100)
  progressPercent?: number;
  selectedText?: string;
  userId?: string;
}

function AIAssistantWithContext({
  isOpen,
  onClose,
  bookId,
  bookTitle,
  currentChapter,
  currentCFI,
  currentText,
  currentPage,
  totalPages,
  progressPercent,
  selectedText,
  userId,
}: EnhancedAIAssistantProps) {
  const { updateBookContext, setAnnotations } = useAIContext();
  const [showAnnotationSelector, setShowAnnotationSelector] = useState(false);
  const supabase = createClient();

  // Update book context when props change
  useEffect(() => {
    updateBookContext({
      bookId,
      bookTitle,
      currentChapter,
      currentCFI,
      currentText: selectedText || currentText,
      currentPage,
      totalPages,
      progressPercent,
    });
  }, [
    bookId,
    bookTitle,
    currentChapter,
    currentCFI,
    currentText,
    selectedText,
    currentPage,
    totalPages,
    progressPercent,
    updateBookContext,
  ]);

  // Load annotations from database
  useEffect(() => {
    const loadAnnotations = async () => {
      if (!bookId || !userId) return;

      const { data: annotations, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && annotations) {
        setAnnotations(
          annotations.map(ann => ({
            id: ann.id,
            type: (ann.annotation_type ?? ann.type) as 'highlight' | 'note' | 'bookmark',
            text: ann.content ?? ann.text ?? ann.selected_text ?? '',
            note: ann.note ?? ann.note_content ?? '',
            cfiRange: ann.location ?? ann.cfi_range ?? ann.cfiRange ?? '',
            color: ann.color || 'sage',
            createdAt: ann.created_at ? new Date(ann.created_at) : undefined,
          }))
        );
      }
    };

    loadAnnotations();
  }, [bookId, userId, supabase, setAnnotations]);

  return (
    <>
      <AIAssistant isOpen={isOpen} onClose={onClose} />
      <AnnotationSelector 
        isOpen={showAnnotationSelector} 
        onClose={() => setShowAnnotationSelector(false)} 
      />
      
      {/* Floating action button to open annotation selector */}
      {isOpen && (
        <button
          onClick={() => setShowAnnotationSelector(true)}
          className="fixed bottom-24 right-8 z-[85] p-3 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 rounded-full shadow-lg backdrop-blur-xl transition-all group"
          title="Select annotations for AI context"
        >
          <MessageSquare className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
        </button>
      )}
    </>
  );
}

export default function EnhancedAIAssistant(props: EnhancedAIAssistantProps) {
  return (
    <AIContextProvider>
      <AIAssistantWithContext {...props} />
    </AIContextProvider>
  );
}