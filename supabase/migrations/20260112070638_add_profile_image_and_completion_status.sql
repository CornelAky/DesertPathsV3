/*
  # Add Profile Image and Completion Status Fields

  1. Changes to Users Table
    - Add `profile_image_url` field for user profile pictures

  2. Changes to Accommodations Table
    - Add `is_completed` boolean field to track completion status
    - Defaults to false

  3. Changes to Activities Table
    - `is_completed` field already exists (no changes needed)

  4. Changes to Dining Table
    - Add `is_completed` boolean field to track completion status
    - Defaults to false

  5. Changes to Transportation Table
    - Add `is_completed` boolean field to track completion status
    - Defaults to false

  6. Changes to Itinerary Days Table
    - Add `is_completed` boolean field to track day completion status
    - Defaults to false

  7. Security
    - No RLS changes needed as tables already have proper policies
*/

-- Add profile image URL to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_image_url text;
  END IF;
END $$;

-- Add is_completed to accommodations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accommodations' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE accommodations ADD COLUMN is_completed boolean DEFAULT false;
  END IF;
END $$;

-- Add is_completed to dining table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE dining ADD COLUMN is_completed boolean DEFAULT false;
  END IF;
END $$;

-- Add is_completed to transportation table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transportation' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE transportation ADD COLUMN is_completed boolean DEFAULT false;
  END IF;
END $$;

-- Add is_completed to itinerary_days table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_days' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE itinerary_days ADD COLUMN is_completed boolean DEFAULT false;
  END IF;
END $$;
