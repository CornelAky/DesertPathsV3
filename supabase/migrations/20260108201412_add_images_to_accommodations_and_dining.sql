/*
  # Add Images Column to Accommodations and Dining Tables

  ## Overview
  This migration adds the `images` column to accommodations and dining tables
  to enable image uploads and storage for these card types, matching the
  functionality already present in activities and transportation tables.

  ## Changes Made

  ### 1. Add Images to Accommodations Table
  - Add `images` column as JSONB array
  - Default to empty array
  - Structure matches activities and transportation tables

  ### 2. Add Images to Dining Table
  - Add `images` column as JSONB array
  - Default to empty array
  - Structure matches activities and transportation tables

  ## Image Structure
  Each image object contains:
  - file_name: Original filename
  - file_path: Storage path in bucket
  - file_url: Public URL for display
  - uploaded_at: ISO timestamp
  - uploaded_by: User ID who uploaded

  ## Notes
  - First image in array is used as card background
  - Images stored in 'section-images' bucket
  - Path format: {table_name}/{record_id}/{filename}
*/

-- ============================================================================
-- 1. ADD IMAGES COLUMN TO ACCOMMODATIONS TABLE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accommodations' AND column_name = 'images'
  ) THEN
    ALTER TABLE accommodations ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN accommodations.images IS 'Array of image objects with file_name, file_path, file_url, uploaded_at, uploaded_by. First image used as card background.';
  END IF;
END $$;

-- ============================================================================
-- 2. ADD IMAGES COLUMN TO DINING TABLE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'images'
  ) THEN
    ALTER TABLE dining ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN dining.images IS 'Array of image objects with file_name, file_path, file_url, uploaded_at, uploaded_by. First image used as card background.';
  END IF;
END $$;
