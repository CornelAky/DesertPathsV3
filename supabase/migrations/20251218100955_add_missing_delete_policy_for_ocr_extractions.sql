/*
  # Add DELETE policy for ocr_extractions

  1. Problem
    - The `ocr_extractions` table has RLS enabled but NO DELETE policy
    - This blocks CASCADE deletion when trips are deleted
    - Cascade chain: trips → uploaded_documents → ocr_extractions → ocr_itinerary_items
  
  2. Changes
    - Add DELETE policy for `ocr_extractions` table
    - Allows admins to delete OCR extraction records
  
  3. Security
    - Only admins can delete OCR extractions
    - Required for CASCADE delete operations when trips are removed
*/

-- Add DELETE policy for ocr_extractions
CREATE POLICY "Admins can delete extractions"
  ON ocr_extractions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );