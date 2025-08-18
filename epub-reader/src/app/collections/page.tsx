"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { 
  ArrowLeftIcon,
  FolderIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon, 
  TrashIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  CheckIcon,
  XMarkIcon,
  BookmarkIcon,
  StarIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import { createClient } from "@/utils/supabase/client";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  book_count?: number;
  recent_books?: {
    id: string;
    cover_url: string | null;
  }[];
}

type ViewMode = 'grid' | 'list';
type SortBy = 'recent' | 'oldest' | 'name' | 'books';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1'
  });

  const router = useRouter();
  const supabase = createClient();

  const COLLECTION_COLORS = [
    { value: '#6366f1', name: 'Indigo' },
    { value: '#8b5cf6', name: 'Violet' },
    { value: '#ec4899', name: 'Pink' },
    { value: '#ef4444', name: 'Red' },
    { value: '#f59e0b', name: 'Amber' },
    { value: '#10b981', name: 'Emerald' },
    { value: '#06b6d4', name: 'Cyan' },
    { value: '#87a96b', name: 'Sage' },
    { value: '#3b82f6', name: 'Blue' },
    { value: '#a855f7', name: 'Purple' }
  ];

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get collections with book count and recent book covers
      const { data: collectionsData, error } = await supabase
        .from('collections')
        .select(`
          *,
          book_collections (
            book_id,
            books (
              id,
              cover_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const collectionsWithDetails = collectionsData?.map(collection => {
        const books = collection.book_collections || [];
        return {
          ...collection,
          book_count: books.length,
          recent_books: books
            .slice(0, 4)
            .map((bc: any) => bc.books)
            .filter((book: any) => book !== null)
        };
      }) || [];

      setCollections(collectionsWithDetails);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Process collections based on search and sort
  const processedCollections = useMemo(() => {
    let filtered = collections;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(collection =>
        collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (collection.description && collection.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'recent':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'books':
        sorted.sort((a, b) => (b.book_count || 0) - (a.book_count || 0));
        break;
    }

    return sorted;
  }, [collections, searchQuery, sortBy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingCollection) {
        // Update existing collection
        const { error } = await supabase
          .from('collections')
          .update({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCollection.id);

        if (error) throw error;
      } else {
        // Create new collection
        const { error } = await supabase
          .from('collections')
          .insert({
            user_id: user.id,
            name: formData.name,
            description: formData.description || null,
            color: formData.color
          });

        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingCollection(null);
      setFormData({ name: '', description: '', color: '#6366f1' });
      fetchCollections();
    } catch (error) {
      console.error('Error saving collection:', error);
    }
  };

  const deleteCollection = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection? This will not delete the books.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId);

      if (error) throw error;
      fetchCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  const startEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      color: collection.color
    });
    setShowCreateModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-[rgb(var(--accent))]/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-[rgb(var(--accent))] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          <p className="text-lg font-medium">Loading collections...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent))]/5 via-transparent to-purple-500/5" />
        <div className="absolute inset-0 bg-gradient-to-tl from-blue-500/5 via-transparent to-transparent animate-gradient" />
      </div>

      <div className="container-px py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/library')}
                className="p-2.5 hover:bg-[rgb(var(--muted))]/10 rounded-xl transition-all hover:scale-105"
                aria-label="Back to library"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight entrance-fade">
                  Collections
                </h1>
                <p className="text-muted mt-1">
                  Organize your library into themed collections
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-2 entrance-scale"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline">New Collection</span>
            </button>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[rgb(var(--muted))]/5 border border-[rgb(var(--border))]/10 focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/20 transition-all"
              />
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              {/* Sort Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="px-4 py-2.5 rounded-xl bg-[rgb(var(--muted))]/5 border border-[rgb(var(--border))]/10 hover:bg-[rgb(var(--muted))]/10 transition-all inline-flex items-center gap-2"
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {sortBy === 'recent' ? 'Recent' : 
                     sortBy === 'oldest' ? 'Oldest' :
                     sortBy === 'name' ? 'Name' : 'Books'}
                  </span>
                </button>
                
                {showSortMenu && (
                  <div className="absolute right-0 mt-2 w-48 glass rounded-xl shadow-2xl py-2 z-20 animate-scale-in">
                    {[
                      { value: 'recent', label: 'Recently Created', icon: ClockIcon },
                      { value: 'oldest', label: 'Oldest First', icon: ClockIcon },
                      { value: 'name', label: 'Name (A-Z)', icon: Squares2X2Icon },
                      { value: 'books', label: 'Most Books', icon: BookmarkIcon }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value as SortBy);
                          setShowSortMenu(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-[rgb(var(--muted))]/10 transition-colors flex items-center gap-3 ${
                          sortBy === option.value ? 'text-[rgb(var(--accent))]' : ''
                        }`}
                      >
                        <option.icon className="w-4 h-4" />
                        <span className="text-sm">{option.label}</span>
                        {sortBy === option.value && (
                          <CheckIcon className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="segmented-control">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  className="inline-flex items-center gap-1.5"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  className="inline-flex items-center gap-1.5"
                >
                  <ListBulletIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4 text-muted" />
              <span className="font-medium">{processedCollections.length}</span>
              <span className="text-muted">collections</span>
            </div>
            <div className="flex items-center gap-2">
              <BookmarkIcon className="w-4 h-4 text-muted" />
              <span className="font-medium">
                {collections.reduce((acc, c) => acc + (c.book_count || 0), 0)}
              </span>
              <span className="text-muted">total books</span>
            </div>
          </div>
        </div>

        {/* Collections Display */}
        {processedCollections.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[rgb(var(--muted))]/10 mb-6">
              <FolderIcon className="w-12 h-12 text-muted" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">
              {searchQuery ? 'No collections found' : 'No collections yet'}
            </h3>
            <p className="text-muted mb-8 max-w-md mx-auto">
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : 'Create your first collection to start organizing your books into themes'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Create Your First Collection
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {processedCollections.map((collection, index) => (
              <div
                key={collection.id}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Link
                  href={`/collections/${collection.id}`}
                  className="block h-full"
                >
                  <div className="glass rounded-2xl p-6 h-full flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    {/* Collection Preview */}
                    <div className="mb-4">
                      {collection.recent_books && collection.recent_books.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1.5 aspect-square rounded-xl overflow-hidden bg-[rgb(var(--muted))]/5">
                          {[...Array(4)].map((_, i) => {
                            const book = collection.recent_books?.[i];
                            return (
                              <div
                                key={i}
                                className="relative bg-[rgb(var(--muted))]/10"
                                style={{
                                  backgroundColor: !book ? `${collection.color}20` : undefined
                                }}
                              >
                                {book?.cover_url ? (
                                  <img
                                    src={book.cover_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <BookmarkIcon 
                                      className="w-8 h-8 opacity-20"
                                      style={{ color: collection.color }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div 
                          className="aspect-square rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${collection.color}15` }}
                        >
                          <FolderIcon 
                            className="w-16 h-16"
                            style={{ color: collection.color }}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Collection Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-lg leading-tight group-hover:text-[rgb(var(--accent))] transition-colors line-clamp-1">
                          {collection.name}
                        </h3>
                        <div
                          className="w-3 h-3 rounded-full shrink-0 mt-1.5"
                          style={{ backgroundColor: collection.color }}
                        />
                      </div>
                      {collection.description && (
                        <p className="text-muted text-sm line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[rgb(var(--border))]/10">
                      <span className="text-xs text-muted">
                        {collection.book_count} {collection.book_count === 1 ? 'book' : 'books'}
                      </span>
                      <span className="text-xs text-muted">
                        {formatDate(collection.created_at)}
                      </span>
                    </div>

                    {/* Actions (show on hover) */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          startEdit(collection);
                        }}
                        className="p-2 glass rounded-lg hover:bg-[rgb(var(--muted))]/20 transition-colors"
                        aria-label="Edit collection"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          deleteCollection(collection.id);
                        }}
                        className="p-2 glass rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"
                        aria-label="Delete collection"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {processedCollections.map((collection, index) => (
              <div
                key={collection.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Link href={`/collections/${collection.id}`}>
                  <div className="glass rounded-xl p-4 flex items-center gap-4 hover:shadow-lg transition-all hover:translate-x-1 group">
                    {/* Color indicator */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${collection.color}20` }}
                    >
                      <FolderIcon 
                        className="w-6 h-6"
                        style={{ color: collection.color }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold group-hover:text-[rgb(var(--accent))] transition-colors truncate">
                          {collection.name}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[rgb(var(--muted))]/10 shrink-0">
                          {collection.book_count} {collection.book_count === 1 ? 'book' : 'books'}
                        </span>
                      </div>
                      {collection.description && (
                        <p className="text-sm text-muted mt-1 line-clamp-1">
                          {collection.description}
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <span className="text-xs text-muted shrink-0 hidden sm:block">
                      {formatDate(collection.created_at)}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          startEdit(collection);
                        }}
                        className="p-2 hover:bg-[rgb(var(--muted))]/10 rounded-lg transition-colors"
                        aria-label="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          deleteCollection(collection.id);
                        }}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                        aria-label="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowCreateModal(false);
              setEditingCollection(null);
              setFormData({ name: '', description: '', color: '#6366f1' });
            }}
          />
          
          <div className="relative w-full max-w-md glass-strong rounded-3xl p-8 shadow-2xl animate-scale-in">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditingCollection(null);
                setFormData({ name: '', description: '', color: '#6366f1' });
              }}
              className="absolute top-4 right-4 p-2 hover:bg-[rgb(var(--muted))]/10 rounded-lg transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-semibold mb-6">
              {editingCollection ? 'Edit Collection' : 'Create New Collection'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Collection Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--muted))]/5 border border-[rgb(var(--border))]/10 focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/20 transition-all"
                  placeholder="e.g., Science Fiction, To Read, Favorites"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Description
                  <span className="text-muted font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--muted))]/5 border border-[rgb(var(--border))]/10 focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/20 transition-all resize-none"
                  placeholder="Add a description for this collection..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">
                  Collection Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {COLLECTION_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                      className={`relative h-12 rounded-xl transition-all ${
                        formData.color === color.value 
                          ? 'ring-2 ring-offset-2 ring-offset-[rgb(var(--bg))] scale-110' 
                          : 'hover:scale-105'
                      }`}
                      style={{ 
                        backgroundColor: color.value,
                        ringColor: formData.color === color.value ? color.value : undefined
                      }}
                      aria-label={color.name}
                    >
                      {formData.color === color.value && (
                        <CheckIcon className="w-4 h-4 text-white absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCollection(null);
                    setFormData({ name: '', description: '', color: '#6366f1' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  {editingCollection ? 'Save Changes' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}