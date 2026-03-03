/*
  # Add Driver Copy Fields to Trips

  ## Overview
  This migration adds functionality for guides to create personal working copies of trips
  that remain in their interface and don't appear in the admin's master trip list.

  ## Changes
  
  1. New Columns
    - `is_driver_copy` (boolean, default false)
      - Marks if a trip is a driver's working copy/draft
      - False or NULL = official trip visible to admins
      - True = driver's personal copy, hidden from admin list
    
    - `original_trip_id` (uuid, nullable)
      - References the original trip this was duplicated from
      - NULL for original trips
      - Set to original trip's ID for driver copies
      - Allows linking back to the source trip
  
  ## Use Cases
  - Guides can duplicate trips to make adjustments without affecting official data
  - Admin dashboard remains clean with only official trips
  - Driver copies are only visible to the guide who created them
  
  ## Security
  - Driver copies are restricted via RLS policies (applied in subsequent steps)
  - Only the creating guide can see and edit their driver copies
*/

-- Add is_driver_copy column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_driver_copy'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_driver_copy boolean DEFAULT false;
    
    -- Create index for performance when filtering driver copies
    CREATE INDEX IF NOT EXISTS idx_trips_is_driver_copy ON trips(is_driver_copy);
  END IF;
END $$;

-- Add original_trip_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'original_trip_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN original_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL;
    
    -- Create index for performance when looking up copies
    CREATE INDEX IF NOT EXISTS idx_trips_original_trip_id ON trips(original_trip_id);
  END IF;
END $$;