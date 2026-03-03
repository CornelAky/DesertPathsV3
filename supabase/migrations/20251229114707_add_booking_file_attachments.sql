/*
  # Add Booking File Attachments System
  
  1. New Tables
    - `activity_booking_attachments`
      - Stores file metadata for activity booking documents (tickets, permits, vouchers)
      - Links to activities table for bookings management
      - Tracks file name, path, URL, upload info
  
  2. Storage
    - Creates 'booking-documents' bucket for storing booking files
    - Supports PDFs, images, Word docs for tickets and permits
  
  3. Security
    - Enable RLS on activity_booking_attachments table
    - Add policies for authenticated users with proper access control
    - Storage policies for upload/view/delete operations
  
  4. Features
    - Multiple attachments per activity booking
    - File preview and download
    - Easy deletion of attachments
    - Tracks uploader and upload timestamp
*/

-- Create activity_booking_attachments table
CREATE TABLE IF NOT EXISTS activity_booking_attachments (
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
ALTER TABLE activity_booking_attachments ENABLE ROW LEVEL SECURITY;

-- Policies for activity_booking_attachments
CREATE POLICY "Users can view booking attachments for activities they have access to"
  ON activity_booking_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN itinerary_days d ON a.day_id = d.id
      JOIN trips t ON d.trip_id = t.id
      WHERE a.id = activity_booking_attachments.activity_id
      AND (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'guide'))
        OR EXISTS (SELECT 1 FROM trip_shares WHERE trip_id = t.id AND shared_with = auth.uid())
        OR t.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert booking attachments if they have edit permission"
  ON activity_booking_attachments FOR INSERT
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

CREATE POLICY "Users can delete booking attachments if they have edit permission"
  ON activity_booking_attachments FOR DELETE
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
CREATE INDEX IF NOT EXISTS idx_activity_booking_attachments_activity_id ON activity_booking_attachments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_booking_attachments_uploaded_by ON activity_booking_attachments(uploaded_by);

-- Create storage bucket for booking documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-documents', 'booking-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for booking-documents bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload booking documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload booking documents"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'booking-documents');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view booking documents'
  ) THEN
    CREATE POLICY "Anyone can view booking documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'booking-documents');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete booking documents'
  ) THEN
    CREATE POLICY "Authenticated users can delete booking documents"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'booking-documents');
  END IF;
END $$;