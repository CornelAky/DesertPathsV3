/*
  # Add OCR Document Processing System

  1. New Tables
    - `uploaded_documents`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `file_name` (text)
      - `file_type` (text) - mime type
      - `file_size` (bigint) - in bytes
      - `storage_path` (text) - path in Supabase Storage
      - `upload_order` (integer) - sequence order for batch uploads
      - `ocr_status` (text) - pending, processing, completed, failed
      - `uploaded_by` (uuid, foreign key to users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `ocr_extractions`
      - `id` (uuid, primary key)
      - `document_id` (uuid, foreign key to uploaded_documents)
      - `raw_text` (text) - full extracted text
      - `structured_data` (jsonb) - parsed itinerary data
      - `confidence_score` (numeric) - OCR confidence
      - `processing_time_ms` (integer)
      - `created_at` (timestamptz)
    
    - `ocr_itinerary_items`
      - `id` (uuid, primary key)
      - `extraction_id` (uuid, foreign key to ocr_extractions)
      - `trip_id` (uuid, foreign key to trips)
      - `day_number` (integer)
      - `date` (date)
      - `time` (text)
      - `activity` (text)
      - `location` (text)
      - `accommodation` (text)
      - `meals` (text)
      - `transportation` (text)
      - `notes` (text)
      - `is_reviewed` (boolean) - manual review status
      - `is_imported` (boolean) - imported to actual itinerary
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage
    - Create storage bucket for documents

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create uploaded_documents table
CREATE TABLE IF NOT EXISTS uploaded_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  storage_path text NOT NULL,
  upload_order integer DEFAULT 0,
  ocr_status text DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ocr_extractions table
CREATE TABLE IF NOT EXISTS ocr_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES uploaded_documents(id) ON DELETE CASCADE,
  raw_text text,
  structured_data jsonb,
  confidence_score numeric(5,2),
  processing_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Create ocr_itinerary_items table
CREATE TABLE IF NOT EXISTS ocr_itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id uuid REFERENCES ocr_extractions(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  day_number integer,
  date date,
  time text,
  activity text,
  location text,
  accommodation text,
  meals text,
  transportation text,
  notes text,
  is_reviewed boolean DEFAULT false,
  is_imported boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_trip_id ON uploaded_documents(trip_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_status ON uploaded_documents(ocr_status);
CREATE INDEX IF NOT EXISTS idx_ocr_extractions_document_id ON ocr_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_itinerary_items_extraction_id ON ocr_itinerary_items(extraction_id);
CREATE INDEX IF NOT EXISTS idx_ocr_itinerary_items_trip_id ON ocr_itinerary_items(trip_id);

-- Enable RLS
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_itinerary_items ENABLE ROW LEVEL SECURITY;

-- Policies for uploaded_documents
CREATE POLICY "Users can view documents for their assigned trips"
  ON uploaded_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = uploaded_documents.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents for their assigned trips"
  ON uploaded_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = uploaded_documents.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents for their assigned trips"
  ON uploaded_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = uploaded_documents.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = uploaded_documents.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents for their assigned trips"
  ON uploaded_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = uploaded_documents.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

-- Policies for ocr_extractions
CREATE POLICY "Users can view extractions for their documents"
  ON ocr_extractions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM uploaded_documents
      JOIN trip_assignments ON trip_assignments.trip_id = uploaded_documents.trip_id
      WHERE uploaded_documents.id = ocr_extractions.document_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create extractions for their documents"
  ON ocr_extractions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploaded_documents
      JOIN trip_assignments ON trip_assignments.trip_id = uploaded_documents.trip_id
      WHERE uploaded_documents.id = ocr_extractions.document_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

-- Policies for ocr_itinerary_items
CREATE POLICY "Users can view itinerary items for their trips"
  ON ocr_itinerary_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = ocr_itinerary_items.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create itinerary items for their trips"
  ON ocr_itinerary_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = ocr_itinerary_items.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update itinerary items for their trips"
  ON ocr_itinerary_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = ocr_itinerary_items.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = ocr_itinerary_items.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete itinerary items for their trips"
  ON ocr_itinerary_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = ocr_itinerary_items.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

-- Create storage bucket for documents (this needs to be done via Supabase dashboard or API)
-- The bucket will be created with name 'itinerary-documents'

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_uploaded_documents_updated_at ON uploaded_documents;
CREATE TRIGGER update_uploaded_documents_updated_at
  BEFORE UPDATE ON uploaded_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ocr_itinerary_items_updated_at ON ocr_itinerary_items;
CREATE TRIGGER update_ocr_itinerary_items_updated_at
  BEFORE UPDATE ON ocr_itinerary_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
