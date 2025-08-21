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
}