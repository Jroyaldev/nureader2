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

      // Generate a placeholder cover (we'll generate from EPUB later)
      const coverPath = `${user.id}/${bookId}/cover.jpg`;
      
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
          cover_url: null, // Will set later when we extract cover
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg animate-scale-in">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <BookOpenIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold">Upload Book</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              disabled={isUploading}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!isUploading ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudArrowUpIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Drop your EPUB here</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">or click to browse files</p>
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
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <svg className="w-24 h-24 -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - uploadProgress / 100)}`}
                        className="text-blue-500 transition-all duration-300"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-semibold">{uploadProgress}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {uploadProgress < 50 ? "Uploading book..." : "Processing metadata..."}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}