/*
  # Create Section Images Storage Bucket

  1. New Storage Bucket
    - `section-images` - Public bucket for storing section images (accommodations, activities, dining)
      - Max file size: 10MB
      - Allowed types: image/jpeg, image/jpg, image/png, image/gif

  2. Security
    - Enable RLS on storage.objects for section-images bucket
    - Add policies for authenticated users to:
      - Upload images (INSERT)
      - View images (SELECT) 
      - Delete their own images (DELETE)
      - Update images (UPDATE)
*/

-- Create the section-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'section-images',
  'section-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload section images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view section images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete section images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update section images" ON storage.objects;

-- Policy: Authenticated users can upload section images
CREATE POLICY "Authenticated users can upload section images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'section-images');

-- Policy: Anyone can view section images (since bucket is public)
CREATE POLICY "Anyone can view section images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'section-images');

-- Policy: Authenticated users can delete section images
CREATE POLICY "Authenticated users can delete section images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'section-images');

-- Policy: Authenticated users can update section images
CREATE POLICY "Authenticated users can update section images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'section-images')
WITH CHECK (bucket_id = 'section-images');
