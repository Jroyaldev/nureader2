-- EPUB Reader Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable Row Level Security

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Create books table
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  file_path TEXT, -- Storage path for EPUB file
  file_size BIGINT,
  cover_url TEXT,
  isbn TEXT,
  language TEXT DEFAULT 'en',
  publisher TEXT,
  published_date DATE,
  page_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reading_progress table
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  book_id UUID REFERENCES public.books NOT NULL,
  current_location TEXT, -- CFI (Canonical Fragment Identifier) or chapter info
  progress_percentage FLOAT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  reading_time_minutes INTEGER DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, book_id)
);

-- Create annotations table (highlights, notes, bookmarks)
CREATE TABLE IF NOT EXISTS public.annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  book_id UUID REFERENCES public.books NOT NULL,
  content TEXT NOT NULL,
  note TEXT,
  location TEXT NOT NULL, -- CFI location in the book
  annotation_type TEXT DEFAULT 'highlight' CHECK (annotation_type IN ('highlight', 'note', 'bookmark')),
  color TEXT DEFAULT '#ffeb3b', -- Highlight color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collections table (for organizing books)
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

-- Create book_collections junction table
CREATE TABLE IF NOT EXISTS public.book_collections (
  book_id UUID REFERENCES public.books NOT NULL,
  collection_id UUID REFERENCES public.collections NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (book_id, collection_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_collections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Create RLS policies for books
CREATE POLICY "Users can view their own books" ON public.books
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own books" ON public.books
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own books" ON public.books
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own books" ON public.books
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Create RLS policies for reading_progress
CREATE POLICY "Users can view their own reading progress" ON public.reading_progress
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own reading progress" ON public.reading_progress
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own reading progress" ON public.reading_progress
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- Create RLS policies for annotations
CREATE POLICY "Users can view their own annotations" ON public.annotations
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own annotations" ON public.annotations
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own annotations" ON public.annotations
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own annotations" ON public.annotations
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Create RLS policies for collections
CREATE POLICY "Users can view their own collections" ON public.collections
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own collections" ON public.collections
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own collections" ON public.collections
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own collections" ON public.collections
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Create RLS policies for book_collections
CREATE POLICY "Users can view their own book collections" ON public.book_collections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.books 
      WHERE books.id = book_collections.book_id 
      AND books.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage their own book collections" ON public.book_collections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.books 
      WHERE books.id = book_collections.book_id 
      AND books.user_id = (SELECT auth.uid())
    )
  );

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create storage bucket for EPUB files
INSERT INTO storage.buckets (id, name, public)
VALUES ('epub-files', 'epub-files', false);

-- Create storage bucket for book covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true);

-- Create storage policies for EPUB files
CREATE POLICY "Users can upload their own EPUB files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'epub-files' AND 
    (SELECT auth.uid()) = owner
  );

CREATE POLICY "Users can view their own EPUB files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'epub-files' AND 
    (SELECT auth.uid()) = owner
  );

CREATE POLICY "Users can update their own EPUB files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'epub-files' AND 
    (SELECT auth.uid()) = owner
  );

CREATE POLICY "Users can delete their own EPUB files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'epub-files' AND 
    (SELECT auth.uid()) = owner
  );

-- Create storage policies for book covers (public read)
CREATE POLICY "Book covers are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'book-covers');

CREATE POLICY "Users can upload book covers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'book-covers');

CREATE POLICY "Users can update book covers" ON storage.objects
  FOR UPDATE USING (bucket_id = 'book-covers');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_user_id ON public.books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_book ON public.reading_progress(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_book ON public.annotations(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_annotations_location ON public.annotations(location);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_books
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_annotations
  BEFORE UPDATE ON public.annotations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_collections
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Insert some sample data (optional)
-- You can uncomment these lines to add sample collections
/*
INSERT INTO public.collections (user_id, name, description, color) VALUES
  ((SELECT id FROM auth.users LIMIT 1), 'Currently Reading', 'Books I am currently reading', '#10b981'),
  ((SELECT id FROM auth.users LIMIT 1), 'Want to Read', 'Books on my reading list', '#3b82f6'),
  ((SELECT id FROM auth.users LIMIT 1), 'Favorites', 'My favorite books', '#ef4444');
*/