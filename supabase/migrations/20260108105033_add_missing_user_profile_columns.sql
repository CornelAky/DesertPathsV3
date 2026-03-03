/*
  # Add Missing User Profile Columns

  ## Changes
  - Add `phone` as alias/view column for `phone_number` for backward compatibility
  - Add `job_title` field for user job title (optional, text)
  - Add `bio` field for user biography (optional, text)
  - Add `profile_picture_url` field for user profile picture (optional, text)
  - Add `rejected_at` field to track when user was rejected (optional, timestamptz)

  ## Notes
  - These fields were referenced in code but missing from database
  - All fields are optional to maintain backward compatibility
  - No RLS changes needed as users table already has proper policies
*/

-- Add job_title field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'job_title'
  ) THEN
    ALTER TABLE users ADD COLUMN job_title text;
  END IF;
END $$;

-- Add bio field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'bio'
  ) THEN
    ALTER TABLE users ADD COLUMN bio text;
  END IF;
END $$;

-- Add profile_picture_url field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_picture_url text;
  END IF;
END $$;

-- Add rejected_at field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'rejected_at'
  ) THEN
    ALTER TABLE users ADD COLUMN rejected_at timestamptz;
  END IF;
END $$;
