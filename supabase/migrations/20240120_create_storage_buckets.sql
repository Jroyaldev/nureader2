-- Create storage buckets for EPUB files and book covers
-- This migration ensures the buckets exist with proper configuration

-- Insert bucket records if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'epub-files',
    'epub-files',
    false,
    52428800, -- 50MB
    ARRAY['application/epub+zip']::text[]
  ),
  (
    'book-covers',
    'book-covers',
    true,
    10485760, -- 10MB
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']::text[]
  )
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for epub-files bucket
CREATE POLICY "Users can upload their own epub files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'epub-files' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can view their own epub files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'epub-files' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can update their own epub files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'epub-files' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can delete their own epub files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'epub-files' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Create RLS policies for book-covers bucket (public read)
CREATE POLICY "Users can upload their own book covers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'book-covers' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Anyone can view book covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'book-covers');

CREATE POLICY "Users can update their own book covers" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'book-covers' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can delete their own book covers" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'book-covers' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );