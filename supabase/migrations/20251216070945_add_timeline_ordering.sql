/*
  # Add Timeline Ordering Support
  
  ## Summary
  This migration adds timeline_order fields to accommodations, activities, and dining tables
  to support custom ordering in the auto-generated timeline view without affecting the
  original day-by-day ordering.
  
  ## Changes Made
  
  ### 1. New Columns
    - Add `timeline_order` to accommodations table
    - Add `timeline_order` to activities table
    - Add `timeline_order` to dining table
  
  ### 2. Purpose
    - The timeline_order field allows managers to customize the order of items in the timeline view
    - This ordering is independent of the display_order used in day-by-day views
    - Default value is 0, allowing items to fall back to chronological ordering
  
  ## Security
    - No new RLS policies needed; existing policies apply to these columns
*/

-- Add timeline_order to accommodations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accommodations' AND column_name = 'timeline_order'
  ) THEN
    ALTER TABLE accommodations ADD COLUMN timeline_order integer DEFAULT 0;
  END IF;
END $$;

-- Add timeline_order to activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'timeline_order'
  ) THEN
    ALTER TABLE activities ADD COLUMN timeline_order integer DEFAULT 0;
  END IF;
END $$;

-- Add timeline_order to dining
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'timeline_order'
  ) THEN
    ALTER TABLE dining ADD COLUMN timeline_order integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accommodations_timeline_order ON accommodations(timeline_order);
CREATE INDEX IF NOT EXISTS idx_activities_timeline_order ON activities(timeline_order);
CREATE INDEX IF NOT EXISTS idx_dining_timeline_order ON dining(timeline_order);
