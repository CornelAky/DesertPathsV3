/*
  # Add Images Support to Master Database Tables

  ## Overview
  This migration adds image storage capability to master database tables, enabling reusable
  locations (hotels, restaurants, sites) to include photos that can be automatically loaded
  when creating new itinerary items.

  ## Changes
  1. **master_hotels** - Add images column for hotel photos
  2. **master_restaurants** - Add images column for restaurant photos
  3. **master_touristic_sites** - Add images column for site/activity photos

  ## Image Format
  Images are stored as JSONB array with structure:
  ```json
  [
    {
      "file_name": "original-name.jpg",
      "file_path": "storage/path/file.jpg",
      "file_url": "https://...",
      "uploaded_at": "2024-01-01T00:00:00Z",
      "uploaded_by": "user-uuid"
    }
  ]
  ```

  ## Use Cases
  - When saving a new activity/accommodation/dining to master database, images are copied
  - When loading from master database, images are automatically populated
  - Images remain independent - editing master doesn't affect existing itineraries
*/

-- Add images column to master_hotels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_hotels' AND column_name = 'images'
  ) THEN
    ALTER TABLE master_hotels ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add images column to master_restaurants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_restaurants' AND column_name = 'images'
  ) THEN
    ALTER TABLE master_restaurants ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add images column to master_touristic_sites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_touristic_sites' AND column_name = 'images'
  ) THEN
    ALTER TABLE master_touristic_sites ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN master_hotels.images IS 'JSONB array of image objects with file_name, file_path, file_url, uploaded_at, uploaded_by';
COMMENT ON COLUMN master_restaurants.images IS 'JSONB array of image objects with file_name, file_path, file_url, uploaded_at, uploaded_by';
COMMENT ON COLUMN master_touristic_sites.images IS 'JSONB array of image objects with file_name, file_path, file_url, uploaded_at, uploaded_by';
