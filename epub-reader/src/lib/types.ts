// Shared type definitions for EPUB renderer components
// This file prevents circular imports between epub-renderer and highlight-manager

/** Type of supported annotations across the reader UI and renderer. */
export type AnnotationType = 'highlight' | 'note' | 'bookmark';

/** Persisted/renderer-ready annotation payload. */
export interface SavedAnnotation {
  id: string;
  location: string;
  content: string;
  color: string;
  annotation_type: AnnotationType;
  note?: string;
  searchText?: string;
  textContext?: string;
  // Enhanced fields for edge case handling
  normalizedText?: string; // Normalized version of content for better matching
  confidence?: number; // Match confidence score (0-1)
  strategy?: string; // Strategy used to find the text ('exact', 'fuzzy', 'context', etc.)
  retryCount?: number; // Number of retry attempts for failed highlights
  lastError?: string; // Last error message for debugging
}