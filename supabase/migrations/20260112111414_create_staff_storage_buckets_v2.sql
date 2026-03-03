/*
  # Create Storage Buckets for Staff Files
  
  1. New Buckets
    - `staff-documents` - For staff documents (licenses, contracts, IDs, certificates)
    - `staff-images` - For staff images (profile photos, additional photos)
  
  2. Security
    - Enable RLS on storage buckets
    - Allow authenticated users to read
    - Allow admins, managers, and linked staff to upload/update/delete their own files
*/

-- Create staff-documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-documents', 'staff-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create staff-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-images', 'staff-images', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can view staff documents
CREATE POLICY "Authenticated users can view staff documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'staff-documents');

-- Policy: Admins and managers can upload staff documents
CREATE POLICY "Admins and managers can upload staff documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'staff-documents' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Policy: Staff can upload their own documents (path starts with their master_staff_id)
CREATE POLICY "Staff can upload their own documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'staff-documents' AND
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.user_id = auth.uid()
      AND name LIKE master_staff.id::text || '/%'
    )
  );

-- Policy: Admins and managers can update staff documents
CREATE POLICY "Admins and managers can update staff documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'staff-documents' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Policy: Staff can update their own documents
CREATE POLICY "Staff can update their own documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'staff-documents' AND
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.user_id = auth.uid()
      AND name LIKE master_staff.id::text || '/%'
    )
  );

-- Policy: Admins and managers can delete staff documents
CREATE POLICY "Admins and managers can delete staff documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'staff-documents' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Policy: Staff can delete their own documents
CREATE POLICY "Staff can delete their own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'staff-documents' AND
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.user_id = auth.uid()
      AND name LIKE master_staff.id::text || '/%'
    )
  );

-- Policies for staff-images (same structure as documents)
CREATE POLICY "Authenticated users can view staff images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'staff-images');

CREATE POLICY "Admins and managers can upload staff images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'staff-images' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can upload their own images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'staff-images' AND
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.user_id = auth.uid()
      AND name LIKE master_staff.id::text || '/%'
    )
  );

CREATE POLICY "Admins and managers can update staff images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'staff-images' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can update their own images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'staff-images' AND
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.user_id = auth.uid()
      AND name LIKE master_staff.id::text || '/%'
    )
  );

CREATE POLICY "Admins and managers can delete staff images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'staff-images' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can delete their own images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'staff-images' AND
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.user_id = auth.uid()
      AND name LIKE master_staff.id::text || '/%'
    )
  );
