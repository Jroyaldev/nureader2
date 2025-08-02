"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { BookOpenIcon, XMarkIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";

// Browser-compatible UUID generator
function generateUUID(): string {
  // Try to use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: Generate UUID v4 compatible string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadComplete }: UploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.name.endsWith('.epub')) {
      setError("Please select an EPUB file");
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get the authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Please sign in to upload books");
      }

      // Generate unique book ID (browser-compatible)
      const bookId = generateUUID();
      const filePath = `${user.id}/${bookId}/book.epub`;

      // Upload EPUB file
      setUploadProgress(10);
      const { error: uploadError } = await supabase.storage
        .from('epub-files')
        .upload(filePath, file, {
          contentType: 'application/epub+zip',
          upsert: false
        });

      if (uploadError) throw uploadError;
      setUploadProgress(30);

      // Extract full metadata from EPUB
      setUploadProgress(50);
      const arrayBuffer = await file.arrayBuffer();
      const mod = await import("epubjs");
      const EpubCtor = mod?.default ?? mod;
      const book = new (EpubCtor as any)(arrayBuffer);
      
      let metadata = {
        title: file.name.replace('.epub', ''),
        author: 'Unknown Author',
        description: null as string | null,
        isbn: null as string | null,
        language: 'en',
        publisher: null as string | null,
        published_date: null as string | null,
        page_count: null as number | null,
        metadata: {} as any
      };

      try {
        const epubMetadata = await book.loaded.metadata;
        metadata = {
          title: epubMetadata.title || metadata.title,
          author: epubMetadata.creator || epubMetadata.author || metadata.author,
          description: epubMetadata.description || null,
          isbn: epubMetadata.identifier || null,
          language: epubMetadata.language || 'en',
          publisher: epubMetadata.publisher || null,
          published_date: epubMetadata.pubdate ? new Date(epubMetadata.pubdate).toISOString().split('T')[0] : null,
          page_count: null, // Will calculate from spine later
          metadata: {
            ...epubMetadata,
            contributor: epubMetadata.contributor,
            rights: epubMetadata.rights,
            subject: epubMetadata.subject
          }
        };

        // Try to get page count from spine
        try {
          const spine = await book.loaded.spine;
          metadata.page_count = spine?.items?.length || null;
        } catch {}

      } catch (error) {
        console.warn('Could not extract full metadata:', error);
      }

      // Try to extract cover from EPUB
      let coverPath: string | null = null;
      try {
        setUploadProgress(60);
        const cover = await book.loaded.cover;
        
        if (cover) {
          // Get the cover URL from the book
          const coverUrl = await book.coverUrl();
          
          if (coverUrl) {
            // Fetch the cover image
            const response = await fetch(coverUrl);
            const blob = await response.blob();
            
            // Determine file extension from MIME type
            const mimeType = blob.type;
            let extension = 'jpg';
            if (mimeType.includes('png')) extension = 'png';
            else if (mimeType.includes('webp')) extension = 'webp';
            else if (mimeType.includes('gif')) extension = 'gif';
            
            coverPath = `${user.id}/${bookId}/cover.${extension}`;
            
            // Upload cover to storage
            const { error: coverUploadError } = await supabase.storage
              .from('book-covers')
              .upload(coverPath, blob, {
                contentType: mimeType,
                upsert: false
              });
            
            if (coverUploadError) {
              console.warn('Could not upload cover:', coverUploadError);
              coverPath = null;
            }
          }
        }
      } catch (error) {
        console.warn('Could not extract cover from EPUB:', error);
      }
      
      // Create book record in database
      setUploadProgress(80);
      const { error: dbError } = await supabase
        .from('books')
        .insert({
          id: bookId,
          user_id: user.id,
          title: metadata.title,
          author: metadata.author,
          description: metadata.description,
          file_path: filePath,
          cover_path: coverPath, // Now we have the extracted cover path
          cover_url: null, // Deprecated field
          isbn: metadata.isbn,
          language: metadata.language,
          publisher: metadata.publisher,
          published_date: metadata.published_date,
          page_count: metadata.page_count,
          file_size: file.size,
          metadata: metadata.metadata
        });

      if (dbError) throw dbError;
      
      setUploadProgress(100);
      setTimeout(() => {
        onUploadComplete();
        onClose();
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload book');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [supabase, onClose, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[rgba(var(--bg),0.8)] backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg animate-scale-in">
        <div className="floating rounded-[var(--radius-2xl)] overflow-hidden" style={{
          boxShadow: "0 25px 80px -12px rgba(0, 0, 0, 0.25), 0 0 0 var(--space-hairline) rgba(var(--border), var(--border-opacity))"
        }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(var(--border),var(--border-opacity))]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[rgb(var(--accent))] rounded-[var(--radius)] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Upload Book</h2>
            </div>
            <button
              onClick={onClose}
              className="btn-icon -mr-2"
              disabled={isUploading}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="3" x2="11" y2="11" />
                <line x1="11" y1="3" x2="3" y2="11" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            {!isUploading ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-[rgba(var(--muted),0.2)] rounded-[var(--radius-xl)] p-16 text-center hover:border-[rgb(var(--accent))] hover:bg-[rgba(var(--accent),0.02)] transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-[var(--radius-lg)] bg-[rgba(var(--muted),0.06)] flex items-center justify-center group-hover:bg-[rgba(var(--accent),0.08)] transition-colors">
                  <svg className="w-10 h-10 text-muted group-hover:text-[rgb(var(--accent))]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 tracking-tight">Drop your EPUB here</h3>
                <p className="text-sm text-muted font-medium">or click to browse files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".epub"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <svg className="w-24 h-24 -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-[rgba(var(--muted),0.1)]"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - uploadProgress / 100)}`}
                        className="text-[rgb(var(--accent))] transition-all duration-300"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-semibold tabular-nums">{uploadProgress}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted font-medium">
                    {uploadProgress < 50 ? "Uploading book..." : "Processing metadata..."}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-500/5 border border-red-500/20 rounded-[var(--radius-lg)]">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}