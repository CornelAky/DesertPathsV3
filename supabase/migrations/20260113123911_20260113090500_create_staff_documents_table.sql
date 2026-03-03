/*
  # Create Staff Documents and Images Table

  1. New Tables
    - `journey_staff_documents`
      - Stores multiple documents/images for each staff member
      - Supports various file types (ID, passport, license, contract, insurance, etc.)
      - Tracks file metadata and upload information

  2. Storage Bucket
    - Create 'staff-documents' bucket if it doesn't exist
    - Configure RLS for secure file access

  3. Security
    - Enable RLS on journey_staff_documents table
    - Only admins and staff with edit permissions can manage documents
    - Staff members can view their own documents via master_staff link
*/

-- Create document type enum
DO $$ BEGIN
  CREATE TYPE staff_document_type AS ENUM (
    'id_card',
    'passport',
    'drivers_license',
    'vehicle_registration',
    'insurance',
    'contract',
    'certification',
    'medical',
    'photo',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create journey_staff_documents table
CREATE TABLE IF NOT EXISTS journey_staff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_staff_id uuid NOT NULL REFERENCES journey_staff(id) ON DELETE CASCADE,
  document_type staff_document_type NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  description text DEFAULT '',
  uploaded_by uuid NOT NULL REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_journey_staff_documents_staff_id ON journey_staff_documents(journey_staff_id);
CREATE INDEX IF NOT EXISTS idx_journey_staff_documents_type ON journey_staff_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_journey_staff_documents_uploaded_by ON journey_staff_documents(uploaded_by);

-- Create storage bucket for staff documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-documents',
  'staff-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on journey_staff_documents
ALTER TABLE journey_staff_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journey_staff_documents

-- Select policy: Users can view documents for journeys they have access to
CREATE POLICY "Users can view staff documents for accessible journeys"
  ON journey_staff_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journey_staff js
      INNER JOIN journeys j ON j.id = js.journey_id
      WHERE js.id = journey_staff_documents.journey_staff_id
      AND (
        j.created_by = auth.uid()
        OR has_edit_permission(j.id)
        OR is_admin()
        -- Staff can view their own documents
        OR EXISTS (
          SELECT 1 FROM master_staff ms
          WHERE ms.id = js.master_staff_id
          AND ms.user_id = auth.uid()
        )
      )
    )
  );

-- Insert policy: Users can add documents for journeys they can edit
CREATE POLICY "Users can add staff documents for editable journeys"
  ON journey_staff_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journey_staff js
      INNER JOIN journeys j ON j.id = js.journey_id
      WHERE js.id = journey_staff_documents.journey_staff_id
      AND (
        j.created_by = auth.uid()
        OR has_edit_permission(j.id)
        OR is_admin()
      )
    )
  );

-- Update policy: Users can update documents for journeys they can edit
CREATE POLICY "Users can update staff documents for editable journeys"
  ON journey_staff_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journey_staff js
      INNER JOIN journeys j ON j.id = js.journey_id
      WHERE js.id = journey_staff_documents.journey_staff_id
      AND (
        j.created_by = auth.uid()
        OR has_edit_permission(j.id)
        OR is_admin()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journey_staff js
      INNER JOIN journeys j ON j.id = js.journey_id
      WHERE js.id = journey_staff_documents.journey_staff_id
      AND (
        j.created_by = auth.uid()
        OR has_edit_permission(j.id)
        OR is_admin()
      )
    )
  );

-- Delete policy: Users can delete documents for journeys they can edit
CREATE POLICY "Users can delete staff documents for editable journeys"
  ON journey_staff_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journey_staff js
      INNER JOIN journeys j ON j.id = js.journey_id
      WHERE js.id = journey_staff_documents.journey_staff_id
      AND (
        j.created_by = auth.uid()
        OR has_edit_permission(j.id)
        OR is_admin()
      )
    )
  );

-- Storage policies for staff-documents bucket (create if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload staff documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload staff documents"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'staff-documents');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view staff documents they have access to'
  ) THEN
    CREATE POLICY "Users can view staff documents they have access to"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'staff-documents');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update staff documents'
  ) THEN
    CREATE POLICY "Users can update staff documents"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'staff-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete staff documents'
  ) THEN
    CREATE POLICY "Users can delete staff documents"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'staff-documents');
  END IF;
END $$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_journey_staff_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journey_staff_documents_updated_at ON journey_staff_documents;

CREATE TRIGGER journey_staff_documents_updated_at
  BEFORE UPDATE ON journey_staff_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_staff_documents_updated_at();
