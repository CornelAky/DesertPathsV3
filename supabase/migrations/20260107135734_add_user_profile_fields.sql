/*
  # Add User Profile Fields

  1. Changes
    - Add `phone_number` field to users table (optional, text)
    - Add `tour_license_url` field to users table (optional, text) - for guides to upload license
    - Add `tour_license_expiry` field to users table (optional, date) - for license expiration tracking

  2. Notes
    - Phone number is available for all user roles
    - Tour license fields are primarily for guides but available to all roles
    - No RLS changes needed as users table already has proper policies
*/

-- Add phone number field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE users ADD COLUMN phone_number text;
  END IF;
END $$;

-- Add tour license URL field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'tour_license_url'
  ) THEN
    ALTER TABLE users ADD COLUMN tour_license_url text;
  END IF;
END $$;

-- Add tour license expiry date field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'tour_license_expiry'
  ) THEN
    ALTER TABLE users ADD COLUMN tour_license_expiry date;
  END IF;
END $$;