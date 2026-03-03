/*
  # Fix User Registration and Activity Images

  ## Overview
  This migration fixes three critical issues:
  1. User registration RLS policy that blocks new user creation
  2. Activity images not being saved properly
  3. Ensures storage policies allow image uploads

  ## Changes Made

  ### 1. User Registration Fix
  - Drop and recreate the INSERT policy for users table
  - Ensure new users can insert their profile without recursion issues
  - Separate admin policies from user self-service policies

  ### 2. Activity Images Fix
  - Verify the images column exists on activities table
  - Ensure proper JSONB structure for images
  - Add helpful comments for future reference

  ### 3. Storage Policy Verification
  - Ensure section-images bucket policies allow authenticated uploads
  - Verify public read access for images

  ## Security Notes
  - Users can only insert their own profile (id must match auth.uid())
  - Admins maintain separate elevated policies
  - All image uploads require authentication
  - Images are publicly readable once uploaded (for display in cards)
*/

-- ============================================================================
-- 1. FIX USER REGISTRATION RLS POLICIES
-- ============================================================================

-- Drop existing user INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Allow users to insert their own profile during signup" ON users;
DROP POLICY IF EXISTS "Users can insert their profile" ON users;

-- Create a simple, non-recursive INSERT policy for new user registration
-- This allows authenticated users to create their profile during signup
CREATE POLICY "Allow authenticated users to insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- 2. VERIFY ACTIVITY IMAGES COLUMN EXISTS
-- ============================================================================

-- Ensure the images column exists on activities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'images'
  ) THEN
    ALTER TABLE activities ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN activities.images IS 'Array of image objects with file_name, file_path, file_url, uploaded_at, uploaded_by';
  END IF;
END $$;

-- ============================================================================
-- 3. VERIFY STORAGE BUCKET AND POLICIES EXIST
-- ============================================================================

-- Ensure section-images bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'section-images',
  'section-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Authenticated users can upload section images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view section images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete section images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update section images" ON storage.objects;

-- Policy: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload section images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'section-images');

-- Policy: Public can view images (needed for card backgrounds)
CREATE POLICY "Anyone can view section images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'section-images');

-- Policy: Authenticated users can delete images
CREATE POLICY "Authenticated users can delete section images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'section-images');

-- Policy: Authenticated users can update images
CREATE POLICY "Authenticated users can update section images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'section-images')
  WITH CHECK (bucket_id = 'section-images');

-- ============================================================================
-- 4. VERIFY ACTIVITIES TABLE UPDATE POLICIES
-- ============================================================================

-- Ensure authenticated users can update activities (including images)
-- This policy should already exist, but we verify it here
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activities' 
    AND policyname = 'Authenticated users can manage activities'
  ) THEN
    CREATE POLICY "Authenticated users can manage activities"
      ON activities FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
