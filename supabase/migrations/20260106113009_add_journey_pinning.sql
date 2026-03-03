/*
  # Add Journey Pinning

  ## Overview
  Add ability to pin journeys so they stay at the top of the list
  regardless of filters and sorting.

  ## Changes
  1. Add `pinned` boolean column to journeys table
  2. Add `pinned_at` timestamp to track when journey was pinned
  3. Column defaults to false
  
  ## Security
  - No RLS changes needed (existing policies cover new column)
*/

-- Add pinned column to journeys table
ALTER TABLE journeys 
ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

-- Create index for faster filtering of pinned journeys
CREATE INDEX IF NOT EXISTS idx_journeys_pinned ON journeys(pinned DESC, pinned_at DESC NULLS LAST);

-- Create comments for documentation
COMMENT ON COLUMN journeys.pinned IS 'Whether this journey is pinned to the top of the list';
COMMENT ON COLUMN journeys.pinned_at IS 'Timestamp when the journey was pinned';
