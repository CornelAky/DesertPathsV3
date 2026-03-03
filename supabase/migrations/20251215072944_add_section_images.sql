/*
  # Add Image Storage for Accommodations, Activities, and Dining

  ## Overview
  This migration adds image storage capabilities to accommodations, activities, and dining sections.
  Images will be stored separately from documents (vouchers/tickets) for visual reference purposes.

  ## Changes

  1. New Columns
    - `accommodations.images` (jsonb) - Array of image objects with metadata
    - `activities.images` (jsonb) - Array of image objects with metadata  
    - `dining.images` (jsonb) - Array of image objects with metadata

  2. Image Object Structure
    Each image object contains:
    - `file_name` (string) - Original file name
    - `file_path` (string) - Storage path in Supabase Storage
    - `file_url` (string) - Public URL for the image
    - `uploaded_at` (timestamp) - When the image was uploaded
    - `uploaded_by` (uuid) - User who uploaded the image

  ## Storage Bucket
  Images will be stored in a 'section-images' bucket with the following structure:
  - accommodations/{accommodation_id}/{filename}
  - activities/{activity_id}/{filename}
  - dining/{dining_id}/{filename}

  ## Security
  - All image columns default to empty arrays
  - Existing RLS policies cover these columns automatically
*/

-- Add images column to accommodations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accommodations' AND column_name = 'images'
  ) THEN
    ALTER TABLE accommodations ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add images column to activities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'images'
  ) THEN
    ALTER TABLE activities ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add images column to dining table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'images'
  ) THEN
    ALTER TABLE dining ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN accommodations.images IS 'Array of image objects for hotel photos (room, lobby, location)';
COMMENT ON COLUMN activities.images IS 'Array of image objects for activity access method visualization';
COMMENT ON COLUMN dining.images IS 'Array of image objects for restaurant photos (venue, seating, food)';