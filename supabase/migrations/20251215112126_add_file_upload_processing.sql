/*
  # File Upload and Data Extraction System

  1. New Tables
    - uploaded_files: stores metadata about uploaded files
    - extracted_itinerary_data: stores extracted data before confirmation

  2. Storage
    - Create storage bucket for uploaded files

  3. Security
    - Enable RLS on both tables
    - Admin users can manage all uploads
*/

-- Create uploaded_files table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_url text NOT NULL,
  processing_status text NOT NULL DEFAULT 'pending',
  error_message text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz
);

-- Create extracted_itinerary_data table
CREATE TABLE IF NOT EXISTS extracted_itinerary_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_file_id uuid REFERENCES uploaded_files(id) ON DELETE CASCADE NOT NULL,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  day_number integer,
  date date,
  time text,
  activity text,
  location text,
  hotel text,
  restaurant text,
  access_method text,
  transportation text,
  comments text,
  confidence_score numeric,
  is_reviewed boolean DEFAULT false NOT NULL,
  is_approved boolean DEFAULT false NOT NULL,
  extracted_at timestamptz DEFAULT now() NOT NULL,
  row_order integer NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_files_trip_id ON uploaded_files(trip_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_extracted_data_file_id ON extracted_itinerary_data(uploaded_file_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_trip_id ON extracted_itinerary_data(trip_id);

-- Create storage bucket for uploaded files
INSERT INTO storage.buckets (id, name, public)
VALUES ('itinerary-uploads', 'itinerary-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_itinerary_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploaded_files
CREATE POLICY "Admin users can view all uploaded files"
  ON uploaded_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert uploaded files"
  ON uploaded_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update uploaded files"
  ON uploaded_files FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete uploaded files"
  ON uploaded_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for extracted_itinerary_data
CREATE POLICY "Admin users can view all extracted data"
  ON extracted_itinerary_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert extracted data"
  ON extracted_itinerary_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update extracted data"
  ON extracted_itinerary_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete extracted data"
  ON extracted_itinerary_data FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Storage policies for itinerary-uploads bucket
CREATE POLICY "Admin users can upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'itinerary-uploads'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin users can read uploaded files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'itinerary-uploads'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete uploaded files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'itinerary-uploads'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );