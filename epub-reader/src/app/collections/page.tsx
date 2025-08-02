"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { 
  FolderIcon, 
  PlusIcon, 
  ArrowLeftIcon,
  BookOpenIcon,
  TrashIcon,
  PencilIcon
} from "@heroicons/react/24/outline";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  book_count?: number;
}

interface Book {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1'
  });

  const router = useRouter();
  const supabase = createClient();

  const COLLECTION_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
    '#f59e0b', '#10b981', '#06b6d4', '#6b7280'
  ];

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get collections with book count
      const { data: collectionsData, error } = await supabase
        .from('collections')
        .select(`
          *,
          book_collections (
            book_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const collectionsWithCount = collectionsData?.map(collection => ({
        ...collection,
        book_count: collection.book_collections?.length || 0
      })) || [];

      setCollections(collectionsWithCount);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

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

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/10">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
          <p className="text-lg font-medium">Loading collections...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/10">
      <div className="container-px py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-light tracking-tight">Collections</h1>
              <p className="text-muted">Organize your books into collections</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            New Collection
          </button>
        </div>

        {/* Collections Grid */}
        {collections.length === 0 ? (
          <div className="text-center py-16">
            <FolderIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-medium mb-2">No collections yet</h3>
            <p className="text-muted mb-6">Create your first collection to organize your books</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Create Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                className="group block"
              >
                <div className="bg-surface rounded-2xl p-6 shadow-lg hover:shadow-xl transition-elegant">
                  {/* Collection Icon */}
                  <div 
                    className="w-16 h-16 rounded-xl mb-4 flex items-center justify-center"
                    style={{ backgroundColor: collection.color }}
                  >
                    <FolderIcon className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Collection Info */}
                  <div className="space-y-2 mb-4">
                    <h3 className="font-medium text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-elegant">
                      {collection.name}
                    </h3>
                    {collection.description && (
                      <p className="text-muted text-sm line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                    <p className="text-xs text-muted">
                      {collection.book_count} {collection.book_count === 1 ? 'book' : 'books'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        startEdit(collection);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        deleteCollection(collection.id);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-red-500"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowCreateModal(false);
              setEditingCollection(null);
              setFormData({ name: '', description: '', color: '#6366f1' });
            }}
          />
          
          <div className="relative w-full max-w-md bg-surface rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xl font-semibold mb-6">
              {editingCollection ? 'Edit Collection' : 'Create Collection'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Collection name"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                  placeholder="Describe your collection"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2">
                  {COLLECTION_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color 
                          ? 'border-gray-900 dark:border-gray-100' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: color }}
                    />
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
                  {editingCollection ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}