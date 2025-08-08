-- Performance indexes for optimized queries
-- This migration adds indexes to improve query performance across all tables

-- Books table indexes
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_last_opened ON books(last_opened DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_books_upload_date ON books(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_user_id_last_opened ON books(user_id, last_opened DESC NULLS LAST);

-- Reading progress indexes
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_book ON reading_progress(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_updated_at ON reading_progress(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_progress_percentage ON reading_progress(percentage_complete);

-- Annotations indexes
CREATE INDEX IF NOT EXISTS idx_annotations_user_book ON annotations(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);
CREATE INDEX IF NOT EXISTS idx_annotations_created_at ON annotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_annotations_user_book_type ON annotations(user_id, book_id, type);
CREATE INDEX IF NOT EXISTS idx_annotations_chapter ON annotations(chapter_id);

-- Collections indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);

-- Book collections indexes (for many-to-many relationships)
CREATE INDEX IF NOT EXISTS idx_book_collections_collection ON book_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_book_collections_book ON book_collections(book_id);
CREATE INDEX IF NOT EXISTS idx_book_collections_added_at ON book_collections(added_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_collections_unique ON book_collections(collection_id, book_id);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at DESC);

-- Partial indexes for common queries
-- Books that have been opened (not null last_opened)
CREATE INDEX IF NOT EXISTS idx_books_recently_read 
ON books(user_id, last_opened DESC) 
WHERE last_opened IS NOT NULL;

-- Active reading progress (not completed)
CREATE INDEX IF NOT EXISTS idx_reading_progress_active 
ON reading_progress(user_id, updated_at DESC) 
WHERE percentage_complete < 100;

-- Bookmarks only (specific annotation type)
CREATE INDEX IF NOT EXISTS idx_annotations_bookmarks 
ON annotations(user_id, book_id, created_at DESC) 
WHERE type = 'bookmark';

-- Highlights only
CREATE INDEX IF NOT EXISTS idx_annotations_highlights 
ON annotations(user_id, book_id, created_at DESC) 
WHERE type = 'highlight';

-- Notes only
CREATE INDEX IF NOT EXISTS idx_annotations_notes 
ON annotations(user_id, book_id, created_at DESC) 
WHERE type = 'note';

-- Add statistics tracking for query optimization
CREATE STATISTICS IF NOT EXISTS books_user_stats ON user_id, last_opened FROM books;
CREATE STATISTICS IF NOT EXISTS annotations_user_book_stats ON user_id, book_id, type FROM annotations;
CREATE STATISTICS IF NOT EXISTS reading_progress_user_book_stats ON user_id, book_id FROM reading_progress;

-- Analyze tables to update statistics
ANALYZE books;
ANALYZE reading_progress;
ANALYZE annotations;
ANALYZE collections;
ANALYZE book_collections;
ANALYZE profiles;

-- Add comments for documentation
COMMENT ON INDEX idx_books_user_id IS 'Index for filtering books by user';
COMMENT ON INDEX idx_books_last_opened IS 'Index for sorting books by last opened date';
COMMENT ON INDEX idx_books_user_id_last_opened IS 'Composite index for user-specific recently read books';
COMMENT ON INDEX idx_reading_progress_user_book IS 'Composite index for finding progress for specific user and book';
COMMENT ON INDEX idx_annotations_user_book_type IS 'Composite index for filtering annotations by user, book, and type';
COMMENT ON INDEX idx_books_recently_read IS 'Partial index for efficiently querying recently read books';
COMMENT ON INDEX idx_reading_progress_active IS 'Partial index for books currently being read';