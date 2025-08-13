-- Add chapter_info column to annotations table for better context
ALTER TABLE public.annotations 
ADD COLUMN IF NOT EXISTS chapter_info TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_annotations_chapter_info ON public.annotations(chapter_info);

-- Comment on the new column
COMMENT ON COLUMN public.annotations.chapter_info IS 'Chapter or section title where the annotation was made';