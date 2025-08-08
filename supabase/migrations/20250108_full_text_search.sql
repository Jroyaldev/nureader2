-- Add full-text search capabilities to books table
-- This migration adds tsvector columns and indexes for efficient text searching

-- Add search vector column to books table
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to generate search vector from book fields
CREATE OR REPLACE FUNCTION books_generate_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.publisher, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.language, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.subjects, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS books_search_vector_update ON books;
CREATE TRIGGER books_search_vector_update
BEFORE INSERT OR UPDATE OF title, author, description, publisher, language, subjects
ON books
FOR EACH ROW
EXECUTE FUNCTION books_generate_search_vector();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_books_search_vector 
ON books USING GIN (search_vector);

-- Update existing rows to populate search vector
UPDATE books 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(author, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(publisher, '')), 'D') ||
  setweight(to_tsvector('english', COALESCE(language, '')), 'D') ||
  setweight(to_tsvector('english', COALESCE(subjects, '')), 'C');

-- Create function for searching books with ranking
CREATE OR REPLACE FUNCTION search_books(
  search_query text,
  user_id_param uuid,
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  author text,
  description text,
  cover_path text,
  file_path text,
  isbn text,
  publisher text,
  published_date date,
  page_count integer,
  language text,
  subjects text,
  upload_date timestamptz,
  last_opened timestamptz,
  file_size_bytes bigint,
  file_hash text,
  rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    b.description,
    b.cover_path,
    b.file_path,
    b.isbn,
    b.publisher,
    b.published_date,
    b.page_count,
    b.language,
    b.subjects,
    b.upload_date,
    b.last_opened,
    b.file_size_bytes,
    b.file_hash,
    ts_rank(b.search_vector, websearch_to_tsquery('english', search_query)) AS rank
  FROM books b
  WHERE 
    b.user_id = user_id_param
    AND b.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY 
    rank DESC,
    b.last_opened DESC NULLS LAST
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_books TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION search_books IS 'Full-text search for books with relevance ranking. Searches across title, author, description, publisher, language, and subjects fields.';