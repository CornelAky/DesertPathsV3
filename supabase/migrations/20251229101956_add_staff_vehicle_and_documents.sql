/*
  # Add Staff Vehicle and Document Fields
  
  1. Changes
    - Add profile_photo_url to trip_staff table for staff profile photos
    - Add document_attachment_url to trip_staff table for document attachments
    - Add has_vehicle boolean to trip_staff table for vehicle assignment logic
    - Add vehicle_type text to trip_staff table for specifying vehicle model/type
  
  2. New Fields
    - profile_photo_url: URL to staff member's profile photo stored in Supabase Storage
    - document_attachment_url: URL to staff member's documents stored in Supabase Storage
    - has_vehicle: Boolean flag indicating if staff member has an assigned vehicle
    - vehicle_type: Text field for vehicle model/type (only relevant when has_vehicle is true)
  
  3. Storage Bucket
    - Create 'staff-documents' bucket for storing profile photos and documents
    - Enable public access for profile photos
    - Enable RLS policies for secure access
  
  4. Notes
    - These fields are optional
    - vehicle_type is only relevant when has_vehicle is true
    - Files are stored in Supabase Storage with proper access control
*/

-- Add new columns to trip_staff table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_staff' AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE trip_staff ADD COLUMN profile_photo_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_staff' AND column_name = 'document_attachment_url'
  ) THEN
    ALTER TABLE trip_staff ADD COLUMN document_attachment_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_staff' AND column_name = 'has_vehicle'
  ) THEN
    ALTER TABLE trip_staff ADD COLUMN has_vehicle boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_staff' AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE trip_staff ADD COLUMN vehicle_type text;
  END IF;
END $$;

-- Create storage bucket for staff documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-documents', 'staff-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for staff documents bucket
DO $$
BEGIN
  -- Policy: Allow authenticated users to upload files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload staff documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload staff documents"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'staff-documents');
  END IF;

  -- Policy: Allow public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for staff documents'
  ) THEN
    CREATE POLICY "Public read access for staff documents"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'staff-documents');
  END IF;

  -- Policy: Allow authenticated users to update their uploads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update staff documents'
  ) THEN
    CREATE POLICY "Authenticated users can update staff documents"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'staff-documents')
      WITH CHECK (bucket_id = 'staff-documents');
  END IF;

  -- Policy: Allow authenticated users to delete their uploads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete staff documents'
  ) THEN
    CREATE POLICY "Authenticated users can delete staff documents"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'staff-documents');
  END IF;
END $$;