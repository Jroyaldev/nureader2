-- Add database constraints and validation rules for data integrity
-- This migration adds CHECK constraints, unique indexes, and validation triggers

-- Books table constraints
ALTER TABLE books 
  ADD CONSTRAINT chk_books_file_size CHECK (file_size_bytes > 0),
  ADD CONSTRAINT chk_books_page_count CHECK (page_count IS NULL OR page_count > 0),
  ADD CONSTRAINT chk_books_dates CHECK (upload_date <= now()),
  ADD CONSTRAINT chk_books_language_format CHECK (language IS NULL OR language ~ '^[a-z]{2}(-[A-Z]{2})?$');

-- Add unique constraint for file hash per user (prevent duplicate uploads)
CREATE UNIQUE INDEX IF NOT EXISTS idx_books_user_file_hash 
ON books(user_id, file_hash) 
WHERE file_hash IS NOT NULL;

-- Reading progress constraints
ALTER TABLE reading_progress
  ADD CONSTRAINT chk_progress_percentage CHECK (percentage_complete >= 0 AND percentage_complete <= 100),
  ADD CONSTRAINT chk_progress_time CHECK (total_time_minutes >= 0),
  ADD CONSTRAINT chk_progress_dates CHECK (updated_at >= created_at);

-- Ensure one progress record per user per book
CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_progress_unique 
ON reading_progress(user_id, book_id);

-- Annotations constraints
ALTER TABLE annotations
  ADD CONSTRAINT chk_annotations_color CHECK (
    color IS NULL OR color IN ('#FFE066', '#FF6B6B', '#4ECDC4', '#95E77E', '#B4A7D6', '#FFB6C1')
  ),
  ADD CONSTRAINT chk_annotations_dates CHECK (updated_at >= created_at),
  ADD CONSTRAINT chk_annotations_type_content CHECK (
    (type = 'bookmark') OR 
    (type IN ('highlight', 'note') AND selected_text IS NOT NULL)
  );

-- Collections constraints
ALTER TABLE collections
  ADD CONSTRAINT chk_collections_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT chk_collections_description_length CHECK (
    description IS NULL OR char_length(description) <= 500
  ),
  ADD CONSTRAINT chk_collections_color CHECK (
    color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'
  );

-- Ensure unique collection names per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_user_name 
ON collections(user_id, lower(name));

-- Profiles constraints
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_theme CHECK (
    theme IS NULL OR theme IN ('light', 'dark', 'system')
  ),
  ADD CONSTRAINT chk_profiles_font_size CHECK (
    font_size IS NULL OR (font_size >= 12 AND font_size <= 32)
  ),
  ADD CONSTRAINT chk_profiles_reading_goal CHECK (
    daily_reading_goal_minutes IS NULL OR 
    (daily_reading_goal_minutes >= 0 AND daily_reading_goal_minutes <= 1440)
  );

-- Create validation trigger for email format in profiles
CREATE OR REPLACE FUNCTION validate_email_format()
RETURNS trigger AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_profile_email
BEFORE INSERT OR UPDATE OF email ON profiles
FOR EACH ROW
EXECUTE FUNCTION validate_email_format();

-- Create validation trigger for ISBN format
CREATE OR REPLACE FUNCTION validate_isbn_format()
RETURNS trigger AS $$
BEGIN
  IF NEW.isbn IS NOT NULL AND NEW.isbn !~ '^(97[89])?\d{9}[\dXx]$' THEN
    -- ISBN doesn't match ISBN-10 or ISBN-13 format
    IF char_length(NEW.isbn) NOT IN (10, 13) THEN
      RAISE EXCEPTION 'Invalid ISBN format: % (must be 10 or 13 characters)', NEW.isbn;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_book_isbn
BEFORE INSERT OR UPDATE OF isbn ON books
FOR EACH ROW
EXECUTE FUNCTION validate_isbn_format();

-- Create function to ensure CFI format validity
CREATE OR REPLACE FUNCTION validate_cfi_format()
RETURNS trigger AS $$
BEGIN
  -- Basic CFI validation (starts with epubcfi()
  IF NEW.cfi_range IS NOT NULL AND NEW.cfi_range NOT LIKE 'epubcfi(%' THEN
    RAISE EXCEPTION 'Invalid CFI format: %', NEW.cfi_range;
  END IF;
  IF NEW.position IS NOT NULL AND NEW.position NOT LIKE 'epubcfi(%' THEN
    RAISE EXCEPTION 'Invalid CFI format for position: %', NEW.position;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply CFI validation to annotations
CREATE TRIGGER validate_annotation_cfi
BEFORE INSERT OR UPDATE OF cfi_range ON annotations
FOR EACH ROW
EXECUTE FUNCTION validate_cfi_format();

-- Apply CFI validation to reading_progress
CREATE TRIGGER validate_progress_cfi
BEFORE INSERT OR UPDATE OF position ON reading_progress
FOR EACH ROW
EXECUTE FUNCTION validate_cfi_format();

-- Create function to prevent orphaned records
CREATE OR REPLACE FUNCTION prevent_orphaned_book_collections()
RETURNS trigger AS $$
BEGIN
  -- Check if the book exists and belongs to the same user as the collection
  IF NOT EXISTS (
    SELECT 1 FROM books b
    JOIN collections c ON c.id = NEW.collection_id
    WHERE b.id = NEW.book_id 
    AND b.user_id = c.user_id
  ) THEN
    RAISE EXCEPTION 'Cannot add book to collection: book and collection must belong to the same user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_orphaned_book_collections_trigger
BEFORE INSERT OR UPDATE ON book_collections
FOR EACH ROW
EXECUTE FUNCTION prevent_orphaned_book_collections();

-- Create function to maintain data consistency on book deletion
CREATE OR REPLACE FUNCTION cascade_book_deletion()
RETURNS trigger AS $$
BEGIN
  -- Log the deletion for audit purposes (optional)
  RAISE NOTICE 'Deleting book % and all related data', OLD.id;
  
  -- Related data will be automatically deleted due to ON DELETE CASCADE
  -- This function can be extended for additional cleanup if needed
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER book_deletion_cascade
BEFORE DELETE ON books
FOR EACH ROW
EXECUTE FUNCTION cascade_book_deletion();

-- Add default values where appropriate
ALTER TABLE books 
  ALTER COLUMN upload_date SET DEFAULT now(),
  ALTER COLUMN language SET DEFAULT 'en';

ALTER TABLE profiles
  ALTER COLUMN theme SET DEFAULT 'system',
  ALTER COLUMN font_size SET DEFAULT 16,
  ALTER COLUMN line_height SET DEFAULT 1.5;

-- Add comments for documentation
COMMENT ON CONSTRAINT chk_books_file_size ON books IS 'Ensures file size is positive';
COMMENT ON CONSTRAINT chk_books_page_count ON books IS 'Ensures page count is positive if set';
COMMENT ON CONSTRAINT chk_progress_percentage ON reading_progress IS 'Ensures percentage is between 0 and 100';
COMMENT ON CONSTRAINT chk_annotations_type_content ON annotations IS 'Ensures highlights and notes have selected text';
COMMENT ON CONSTRAINT chk_collections_name_length ON collections IS 'Limits collection name to 100 characters';
COMMENT ON INDEX idx_books_user_file_hash IS 'Prevents duplicate book uploads per user';
COMMENT ON INDEX idx_collections_user_name IS 'Ensures unique collection names per user (case-insensitive)';