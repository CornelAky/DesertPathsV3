/*
  # Add Activity File Management System
  
  1. New Tables
    - `activity_attachments`
      - Stores file metadata for activity documents (tickets, PDFs, images)
      - Links to activities table
      - Tracks file name, path, URL, upload info
  
  2. Storage
    - Creates 'activity-documents' bucket for storing activity files
    - Supports PDFs, images, Word docs, Excel files
  
  3. Security
    - Enable RLS on activity_attachments table
    - Add policies for authenticated users with proper access control
    - Storage policies for upload/view/delete operations
  
  4. Features
    - Multiple attachments per activity
    - File preview and download
    - Easy deletion of attachments
    - Tracks uploader and upload timestamp
*/

-- Create activity_attachments table
CREATE TABLE IF NOT EXISTS activity_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_attachments ENABLE ROW LEVEL SECURITY;

-- Policies for activity_attachments
CREATE POLICY "Users can view attachments for activities they have access to"
  ON activity_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN itinerary_days d ON a.day_id = d.id
      JOIN trips t ON d.trip_id = t.id
      WHERE a.id = activity_attachments.activity_id
      AND (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'guide'))
        OR EXISTS (SELECT 1 FROM trip_shares WHERE trip_id = t.id AND shared_with = auth.uid())
        OR t.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert attachments if they have edit permission"
  ON activity_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN itinerary_days d ON a.day_id = d.id
      JOIN trips t ON d.trip_id = t.id
      WHERE a.id = activity_id
      AND has_edit_permission(t.id)
    )
  );

CREATE POLICY "Users can delete attachments if they have edit permission"
  ON activity_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN itinerary_days d ON a.day_id = d.id
      JOIN trips t ON d.trip_id = t.id
      WHERE a.id = activity_id
      AND has_edit_permission(t.id)
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_attachments_activity_id ON activity_attachments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_attachments_uploaded_by ON activity_attachments(uploaded_by);

-- Create storage bucket for activity documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-documents', 'activity-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for activity-documents bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload activity documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload activity documents"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'activity-documents');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view activity documents'
  ) THEN
    CREATE POLICY "Anyone can view activity documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'activity-documents');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete activity documents'
  ) THEN
    CREATE POLICY "Authenticated users can delete activity documents"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'activity-documents');
  END IF;
END $$;