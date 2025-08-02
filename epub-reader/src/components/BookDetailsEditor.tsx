"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { XMarkIcon, SparklesIcon, BookOpenIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";

interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_path: string | null;
  cover_url: string | null;
  isbn: string | null;
  language: string;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

interface BookDetailsEditorProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const AI_COVER_PRESETS = [
  { id: 'minimalist', name: 'Minimalist', description: 'Clean, simple designs with typography focus' },
  { id: 'abstract', name: 'Abstract', description: 'Geometric shapes and modern patterns' },
  { id: 'vintage', name: 'Vintage', description: 'Classic book cover aesthetics' },
  { id: 'fantasy', name: 'Fantasy', description: 'Magical and imaginative artwork' },
  { id: 'sci-fi', name: 'Sci-Fi', description: 'Futuristic and technology-inspired' },
  { id: 'literary', name: 'Literary', description: 'Artistic and thought-provoking designs' },
  { id: 'noir', name: 'Noir', description: 'Dark, mysterious atmosphere' },
  { id: 'watercolor', name: 'Watercolor', description: 'Soft, artistic painting style' },
];

export default function BookDetailsEditor({ book, isOpen, onClose, onUpdate }: BookDetailsEditorProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'metadata' | 'cover'>('metadata');
  const [selectedPreset, setSelectedPreset] = useState('minimalist');
  const [customPrompt, setCustomPrompt] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    title: book.title,
    author: book.author || '',
    description: book.description || '',
    isbn: book.isbn || '',
    language: book.language || 'en',
    publisher: book.publisher || '',
    published_date: book.published_date || '',
    page_count: book.page_count || 0,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: book.title,
        author: book.author || '',
        description: book.description || '',
        isbn: book.isbn || '',
        language: book.language || 'en',
        publisher: book.publisher || '',
        published_date: book.published_date || '',
        page_count: book.page_count || 0,
      });
    }
  }, [book, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveMetadata = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({
          title: formData.title,
          author: formData.author || null,
          description: formData.description || null,
          isbn: formData.isbn || null,
          language: formData.language,
          publisher: formData.publisher || null,
          published_date: formData.published_date || null,
          page_count: formData.page_count || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', book.id);

      if (error) throw error;
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating book:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCoverUrl = (coverPath: string | null) => {
    if (!coverPath) return null;
    const { data } = supabase.storage.from('book-covers').getPublicUrl(coverPath);
    return data.publicUrl;
  };

  const generatePromptFromMetadata = () => {
    const preset = AI_COVER_PRESETS.find(p => p.id === selectedPreset);
    return `Book cover design in ${preset?.name} style: "${formData.title}" by ${formData.author || 'Unknown Author'}. ${preset?.description}. ${customPrompt}`;
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, or WebP)');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');


      // Generate file path
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `cover.${fileExt}`;
      const filePath = `${user.id}/${book.id}/${fileName}`;

      // First, check if we need to delete the old cover
      if (book.cover_path) {
        try {
          await supabase.storage
            .from('book-covers')
            .remove([book.cover_path]);
        } catch (err) {
          console.warn('Could not remove old cover:', err);
        }
      }

      // Upload to storage with proper error handling
      setUploadProgress(50);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Check for common errors
        if (uploadError.message?.includes('row-level security') || uploadError.statusCode === 403) {
          throw new Error('Permission denied. Please ensure you are logged in.');
        } else if (uploadError.message?.includes('not found') || uploadError.statusCode === 404) {
          throw new Error('Storage bucket not found. Please contact support.');
        } else if (uploadError.message?.includes('payload too large') || uploadError.statusCode === 413) {
          throw new Error('File is too large. Maximum size is 10MB.');
        }
        throw new Error(uploadError.message || 'Failed to upload cover image');
      }

      // Update book record
      setUploadProgress(75);
      const { error: updateError } = await supabase
        .from('books')
        .update({
          cover_path: filePath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', book.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        // Try to clean up uploaded file
        await supabase.storage.from('book-covers').remove([filePath]);
        throw new Error(updateError.message || 'Failed to update book record');
      }

      // Update the book prop to reflect the new cover
      book.cover_path = filePath;
      
      setUploadProgress(100);
      setTimeout(() => {
        onUpdate();
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error('Error uploading cover:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload cover image');
      setUploadProgress(0);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-[rgb(var(--bg))] rounded-[var(--radius-lg)] shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="border-b border-[rgba(var(--muted),0.1)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">Edit Book Details</h2>
            <button
              onClick={onClose}
              className="btn-icon w-10 h-10"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            <button
              onClick={() => setActiveTab('metadata')}
              className={`px-4 py-2 text-sm font-medium rounded-[var(--radius)] transition-colors ${
                activeTab === 'metadata' 
                  ? 'bg-[rgba(var(--accent),0.1)] text-[rgb(var(--accent))]' 
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Metadata
            </button>
            <button
              onClick={() => setActiveTab('cover')}
              className={`px-4 py-2 text-sm font-medium rounded-[var(--radius)] transition-colors ${
                activeTab === 'cover' 
                  ? 'bg-[rgba(var(--accent),0.1)] text-[rgb(var(--accent))]' 
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Book Cover
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {activeTab === 'metadata' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Author</label>
                  <input
                    type="text"
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">ISBN</label>
                  <input
                    type="text"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Language</label>
                  <input
                    type="text"
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Publisher</label>
                  <input
                    type="text"
                    name="publisher"
                    value={formData.publisher}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Published Date</label>
                  <input
                    type="date"
                    name="published_date"
                    value={formData.published_date}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Page Count</label>
                  <input
                    type="number"
                    name="page_count"
                    value={formData.page_count}
                    onChange={handleInputChange}
                    className="input w-full"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="input w-full resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Cover */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <h3 className="text-sm font-medium text-foreground mb-3">Current Cover</h3>
                  <div className="w-32 h-48 rounded-[var(--radius)] overflow-hidden bg-gradient-to-br from-[rgba(var(--muted),0.05)] to-[rgba(var(--muted),0.1)]">
                    {book.cover_path && getCoverUrl(book.cover_path) ? (
                      <img 
                        src={getCoverUrl(book.cover_path)!} 
                        alt={`${book.title} cover`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpenIcon className="w-8 h-8 text-muted opacity-40" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-foreground mb-3">Update Cover</h3>
                  
                  <div className="space-y-6">
                    {/* Upload Option */}
                    <div>
                      <h4 className="text-sm text-muted mb-3">Upload Custom Cover</h4>
                      <div className="space-y-3">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="btn-secondary w-full inline-flex items-center justify-center gap-2"
                          disabled={isLoading}
                        >
                          <ArrowUpTrayIcon className="w-4 h-4" />
                          Upload Image
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="hidden"
                        />
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className="w-full bg-[rgba(var(--muted),0.1)] rounded-full h-2">
                            <div 
                              className="bg-[rgb(var(--accent))] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        )}
                        <p className="text-xs text-muted">Supported formats: PNG, JPG, JPEG, WebP</p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[rgba(var(--muted),0.1)]" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-[rgb(var(--bg))] text-muted">or</span>
                      </div>
                    </div>
                    
                    {/* AI Generation */}
                    <div>
                      <h4 className="text-sm text-muted mb-3">AI Cover Generation</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-muted mb-2 block">Select Style</label>
                          <div className="grid grid-cols-2 gap-3">
                            {AI_COVER_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                onClick={() => setSelectedPreset(preset.id)}
                                className={`p-3 rounded-[var(--radius)] border transition-all text-left ${
                                  selectedPreset === preset.id
                                    ? 'border-[rgb(var(--accent))] bg-[rgba(var(--accent),0.05)]'
                                    : 'border-[rgba(var(--muted),0.2)] hover:border-[rgba(var(--muted),0.4)]'
                                }`}
                              >
                                <div className="font-medium text-sm">{preset.name}</div>
                                <div className="text-xs text-muted mt-1">{preset.description}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Custom Prompt */}
                        <div>
                          <label className="text-sm text-muted mb-2 block">Additional Details (Optional)</label>
                          <textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="Add specific details for the AI to include..."
                            rows={3}
                            className="input w-full resize-none"
                          />
                        </div>
                        
                        {/* Generated Prompt Preview */}
                        <div className="p-3 rounded-[var(--radius)] bg-[rgba(var(--muted),0.05)] border border-[rgba(var(--muted),0.1)]">
                          <div className="text-xs text-muted mb-1">AI Prompt Preview:</div>
                          <div className="text-sm">{generatePromptFromMetadata()}</div>
                        </div>
                        
                        {/* Generate Button */}
                        <button
                          className="btn-primary w-full inline-flex items-center justify-center gap-2"
                          disabled={isLoading}
                        >
                          <SparklesIcon className="w-4 h-4" />
                          Generate Cover
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-[rgba(var(--muted),0.1)] p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn-secondary px-6"
              disabled={isLoading}
            >
              Cancel
            </button>
            {activeTab === 'metadata' && (
              <button
                onClick={handleSaveMetadata}
                className="btn-primary px-6"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}