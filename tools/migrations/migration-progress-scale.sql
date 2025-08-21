-- Migration: Update progress_percentage scale from 0-100 to 0-1
-- This migration handles the transition from percentage (0-100) to fraction (0-1) scale
-- for reading progress values.

-- Step 1: First, let's see what values we currently have
SELECT 
  'Current progress_percentage distribution:' as info,
  COUNT(*) as total_records,
  MIN(progress_percentage) as min_value,
  MAX(progress_percentage) as max_value,
  AVG(progress_percentage) as avg_value,
  COUNT(CASE WHEN progress_percentage > 1 THEN 1 END) as values_over_1,
  COUNT(CASE WHEN progress_percentage <= 1 THEN 1 END) as values_0_to_1
FROM reading_progress;

-- Step 2: Show records that need migration (values > 1)
SELECT 
  'Records needing migration (progress_percentage > 1):' as info,
  id,
  user_id,
  book_id,
  progress_percentage as current_value,
  ROUND(progress_percentage / 100.0, 4) as new_value,
  last_read_at
FROM reading_progress 
WHERE progress_percentage > 1
ORDER BY last_read_at DESC;

-- Step 3: Temporarily remove the constraint to allow migration
ALTER TABLE reading_progress 
DROP CONSTRAINT IF EXISTS reading_progress_progress_percentage_check;

-- Step 4: Update all values > 1 to be in 0-1 scale
UPDATE reading_progress 
SET progress_percentage = progress_percentage / 100.0 
WHERE progress_percentage > 1;

-- Step 5: Add the new constraint for 0-1 scale
ALTER TABLE reading_progress 
ADD CONSTRAINT reading_progress_progress_percentage_check 
CHECK (progress_percentage >= 0 AND progress_percentage <= 1);

-- Step 6: Verify the migration
SELECT 
  'Post-migration progress_percentage distribution:' as info,
  COUNT(*) as total_records,
  MIN(progress_percentage) as min_value,
  MAX(progress_percentage) as max_value,
  AVG(progress_percentage) as avg_value,
  COUNT(CASE WHEN progress_percentage > 1 THEN 1 END) as values_over_1,
  COUNT(CASE WHEN progress_percentage <= 1 THEN 1 END) as values_0_to_1
FROM reading_progress;

-- Step 7: Show sample of migrated values
SELECT 
  'Sample of migrated values:' as info,
  id,
  progress_percentage,
  ROUND(progress_percentage * 100, 1) || '%' as percentage_display,
  last_read_at
FROM reading_progress 
ORDER BY last_read_at DESC 
LIMIT 10;