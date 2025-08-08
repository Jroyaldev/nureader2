-- Create reading_sessions table for detailed progress tracking
-- This table tracks individual reading sessions with start/end times and progress

-- Create reading_sessions table
CREATE TABLE IF NOT EXISTS reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  
  -- Session timing
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer GENERATED ALWAYS AS (
    CASE 
      WHEN ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (ended_at - started_at))::integer
      ELSE NULL
    END
  ) STORED,
  
  -- Progress tracking
  start_chapter_id text,
  end_chapter_id text,
  start_cfi text,
  end_cfi text,
  start_percentage numeric(5,2) CHECK (start_percentage >= 0 AND start_percentage <= 100),
  end_percentage numeric(5,2) CHECK (end_percentage >= 0 AND end_percentage <= 100),
  pages_read integer CHECK (pages_read >= 0),
  
  -- Device and context
  device_type text CHECK (device_type IN ('desktop', 'tablet', 'mobile', 'unknown')),
  browser text,
  os text,
  viewport_width integer,
  viewport_height integer,
  
  -- Session metadata
  is_active boolean DEFAULT true,
  idle_time_seconds integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for reading_sessions
CREATE INDEX idx_reading_sessions_user ON reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_book ON reading_sessions(book_id);
CREATE INDEX idx_reading_sessions_user_book ON reading_sessions(user_id, book_id);
CREATE INDEX idx_reading_sessions_started_at ON reading_sessions(started_at DESC);
CREATE INDEX idx_reading_sessions_active ON reading_sessions(user_id, book_id) WHERE is_active = true;

-- Create function to automatically end active sessions when starting a new one
CREATE OR REPLACE FUNCTION end_active_reading_sessions()
RETURNS trigger AS $$
BEGIN
  -- End all other active sessions for this user
  UPDATE reading_sessions
  SET 
    is_active = false,
    ended_at = CASE 
      WHEN ended_at IS NULL THEN now() 
      ELSE ended_at 
    END,
    updated_at = now()
  WHERE 
    user_id = NEW.user_id 
    AND id != NEW.id
    AND is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ending active sessions
CREATE TRIGGER end_active_sessions_trigger
AFTER INSERT ON reading_sessions
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION end_active_reading_sessions();

-- Create function to calculate reading statistics
CREATE OR REPLACE FUNCTION get_reading_statistics(
  user_id_param uuid,
  book_id_param uuid DEFAULT NULL,
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  total_sessions bigint,
  total_reading_time_seconds bigint,
  average_session_duration_seconds numeric,
  total_pages_read bigint,
  unique_books_read bigint,
  longest_session_seconds integer,
  most_productive_hour integer,
  preferred_device text,
  daily_average_seconds numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT 
      rs.id,
      rs.book_id,
      rs.duration_seconds,
      rs.pages_read,
      rs.device_type,
      EXTRACT(HOUR FROM rs.started_at AT TIME ZONE 'UTC') AS reading_hour,
      rs.started_at::date AS reading_date
    FROM reading_sessions rs
    WHERE 
      rs.user_id = user_id_param
      AND (book_id_param IS NULL OR rs.book_id = book_id_param)
      AND (start_date IS NULL OR rs.started_at >= start_date)
      AND (end_date IS NULL OR rs.started_at <= end_date)
      AND rs.duration_seconds IS NOT NULL
  ),
  daily_stats AS (
    SELECT 
      reading_date,
      SUM(duration_seconds) AS daily_seconds
    FROM session_stats
    GROUP BY reading_date
  )
  SELECT 
    COUNT(DISTINCT ss.id)::bigint AS total_sessions,
    COALESCE(SUM(ss.duration_seconds), 0)::bigint AS total_reading_time_seconds,
    COALESCE(AVG(ss.duration_seconds), 0)::numeric AS average_session_duration_seconds,
    COALESCE(SUM(ss.pages_read), 0)::bigint AS total_pages_read,
    COUNT(DISTINCT ss.book_id)::bigint AS unique_books_read,
    COALESCE(MAX(ss.duration_seconds), 0)::integer AS longest_session_seconds,
    MODE() WITHIN GROUP (ORDER BY ss.reading_hour)::integer AS most_productive_hour,
    MODE() WITHIN GROUP (ORDER BY ss.device_type) AS preferred_device,
    COALESCE(AVG(ds.daily_seconds), 0)::numeric AS daily_average_seconds
  FROM session_stats ss
  CROSS JOIN daily_stats ds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get reading streaks
CREATE OR REPLACE FUNCTION get_reading_streak(user_id_param uuid)
RETURNS TABLE(
  current_streak integer,
  longest_streak integer,
  total_reading_days integer,
  last_reading_date date
) AS $$
WITH reading_days AS (
  SELECT DISTINCT started_at::date AS reading_date
  FROM reading_sessions
  WHERE user_id = user_id_param
  ORDER BY reading_date DESC
),
streaks AS (
  SELECT 
    reading_date,
    reading_date - (ROW_NUMBER() OVER (ORDER BY reading_date))::integer AS streak_group
  FROM reading_days
),
streak_lengths AS (
  SELECT 
    MIN(reading_date) AS streak_start,
    MAX(reading_date) AS streak_end,
    COUNT(*) AS streak_length
  FROM streaks
  GROUP BY streak_group
)
SELECT 
  CASE 
    WHEN MAX(reading_date) >= CURRENT_DATE - INTERVAL '1 day' 
    THEN (
      SELECT streak_length 
      FROM streak_lengths 
      WHERE streak_end >= CURRENT_DATE - INTERVAL '1 day'
      LIMIT 1
    )::integer
    ELSE 0
  END AS current_streak,
  COALESCE(MAX(streak_length), 0)::integer AS longest_streak,
  COUNT(*)::integer AS total_reading_days,
  MAX(reading_date) AS last_reading_date
FROM reading_days
LEFT JOIN streak_lengths ON true;
$$ LANGUAGE sql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own reading sessions" ON reading_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading sessions" ON reading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading sessions" ON reading_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading sessions" ON reading_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON reading_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION get_reading_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_reading_streak TO authenticated;

-- Add updated_at trigger
CREATE TRIGGER update_reading_sessions_updated_at
BEFORE UPDATE ON reading_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE reading_sessions IS 'Tracks individual reading sessions with detailed metrics for analytics';
COMMENT ON FUNCTION get_reading_statistics IS 'Calculates comprehensive reading statistics for a user, optionally filtered by book and date range';
COMMENT ON FUNCTION get_reading_streak IS 'Calculates reading streak information including current streak, longest streak, and total reading days';