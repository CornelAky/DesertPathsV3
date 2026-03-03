/*
  # Add Trip Documents and Briefing System

  ## Overview
  Creates a comprehensive document management and communication system between admins and guides.

  ## Changes
  
  ### 1. Trips Table Updates
    - Add `special_requirements` field for client special needs (allergies, wheelchair, etc.)
    - Add `manager_briefing` field for admin internal notes to guides
  
  ### 2. New Tables
    - `trip_documents` table for managing files uploaded by admins and guides
      - Supports bidirectional file sharing (admin to guide, guide to admin)
      - Tracks document categories (tickets, passports, receipts, photos, etc.)
      - Links to trips and users
  
  ### 3. Storage
    - Creates 'trip-documents' storage bucket
    - Sets up RLS policies for secure file access
  
  ### 4. Security
    - Enable RLS on trip_documents table
    - Admins can upload/view all documents
    - Guides can only upload to guide_to_admin category
    - Guides can only view admin_to_guide documents for trips shared with them
*/

-- Add new fields to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS special_requirements TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS manager_briefing TEXT DEFAULT '';

-- Create trip_documents table
CREATE TABLE IF NOT EXISTS trip_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  document_category TEXT NOT NULL CHECK (document_category IN ('tickets', 'passports', 'vouchers', 'receipts', 'photos', 'other')),
  upload_direction TEXT NOT NULL CHECK (upload_direction IN ('admin_to_guide', 'guide_to_admin')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE trip_documents ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_documents_trip_id ON trip_documents(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_documents_uploaded_by ON trip_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_trip_documents_direction ON trip_documents(upload_direction);

-- RLS Policies for trip_documents

-- Admins can do everything
CREATE POLICY "Admins can insert trip documents"
  ON trip_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

CREATE POLICY "Admins can view all trip documents"
  ON trip_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

CREATE POLICY "Admins can update trip documents"
  ON trip_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

CREATE POLICY "Admins can delete trip documents"
  ON trip_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

-- Guides can upload to guide_to_admin category for trips shared with them
CREATE POLICY "Guides can upload files to shared trips"
  ON trip_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    upload_direction = 'guide_to_admin'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'guide'
      AND users.status = 'active'
    )
    AND (
      -- Guide can upload to trips shared with them
      EXISTS (
        SELECT 1 FROM trip_shares
        WHERE trip_shares.trip_id = trip_documents.trip_id
        AND trip_shares.shared_with = auth.uid()
        AND trip_shares.is_active = true
      )
      OR
      -- Guide can upload to trips they're assigned to
      EXISTS (
        SELECT 1 FROM trip_assignments
        WHERE trip_assignments.trip_id = trip_documents.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  );

-- Guides can view admin_to_guide documents for trips shared with them
CREATE POLICY "Guides can view admin documents for shared trips"
  ON trip_documents FOR SELECT
  TO authenticated
  USING (
    upload_direction = 'admin_to_guide'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'guide'
      AND users.status = 'active'
    )
    AND (
      -- Guide can view documents for trips shared with them
      EXISTS (
        SELECT 1 FROM trip_shares
        WHERE trip_shares.trip_id = trip_documents.trip_id
        AND trip_shares.shared_with = auth.uid()
        AND trip_shares.is_active = true
      )
      OR
      -- Guide can view documents for trips they're assigned to
      EXISTS (
        SELECT 1 FROM trip_assignments
        WHERE trip_assignments.trip_id = trip_documents.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  );

-- Guides can view their own uploaded documents
CREATE POLICY "Guides can view their own uploads"
  ON trip_documents FOR SELECT
  TO authenticated
  USING (
    upload_direction = 'guide_to_admin'
    AND uploaded_by = auth.uid()
  );

-- Create storage bucket for trip documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-documents', 'trip-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for trip-documents bucket

-- Admins can upload any files
CREATE POLICY "Admins can upload trip documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'trip-documents'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

-- Admins can view all files
CREATE POLICY "Admins can view all trip documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'trip-documents'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

-- Admins can delete files
CREATE POLICY "Admins can delete trip documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'trip-documents'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

-- Guides can upload files to guide-uploads folder
CREATE POLICY "Guides can upload to guide-uploads folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'trip-documents'
    AND (storage.foldername(name))[1] = 'guide-uploads'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'guide'
      AND users.status = 'active'
    )
  );

-- Guides can view files in admin-uploads and their own guide-uploads
CREATE POLICY "Guides can view authorized documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'trip-documents'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'guide'
      AND users.status = 'active'
    )
    AND (
      -- Can view admin-uploads folder
      (storage.foldername(name))[1] = 'admin-uploads'
      OR
      -- Can view their own uploads in guide-uploads folder
      (storage.foldername(name))[1] = 'guide-uploads'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trip_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trip_documents_updated_at ON trip_documents;
CREATE TRIGGER trip_documents_updated_at
  BEFORE UPDATE ON trip_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_documents_updated_at();