/*
  # Create Transportation Documents Storage Bucket
  
  1. Storage Bucket
    - Create 'transportation-documents' bucket for document storage
    - Set as public for easy access
  
  2. Storage Policies
    - Authenticated users can upload documents
    - Authenticated users can view documents
    - Authenticated users can delete documents
*/

-- Create storage bucket for transportation documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('transportation-documents', 'transportation-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for transportation-documents bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload transportation documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload transportation documents"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'transportation-documents');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view transportation documents'
  ) THEN
    CREATE POLICY "Anyone can view transportation documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'transportation-documents');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete transportation documents'
  ) THEN
    CREATE POLICY "Authenticated users can delete transportation documents"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'transportation-documents');
  END IF;
END $$;
