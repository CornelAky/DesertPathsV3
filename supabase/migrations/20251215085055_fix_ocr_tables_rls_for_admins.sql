/*
  # Fix OCR tables RLS policies for admin access

  1. Changes
    - Update ocr_extractions policies to allow admins full access
    - Update ocr_itinerary_items policies to allow admins full access
    - Keep existing policies for guides (users assigned to trips)

  2. Security
    - Admins have full access to all OCR data
    - Guides can only access OCR data for trips they're assigned to
*/

-- ocr_extractions policies
DROP POLICY IF EXISTS "Users can create extractions for their documents" ON ocr_extractions;
DROP POLICY IF EXISTS "Users can view extractions for their documents" ON ocr_extractions;

CREATE POLICY "Users can create extractions"
ON ocr_extractions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (
      users.role = 'admin'
      OR EXISTS (
        SELECT 1 
        FROM uploaded_documents
        JOIN trip_assignments ON trip_assignments.trip_id = uploaded_documents.trip_id
        WHERE uploaded_documents.id = ocr_extractions.document_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can view extractions"
ON ocr_extractions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (
      users.role = 'admin'
      OR EXISTS (
        SELECT 1 
        FROM uploaded_documents
        JOIN trip_assignments ON trip_assignments.trip_id = uploaded_documents.trip_id
        WHERE uploaded_documents.id = ocr_extractions.document_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  )
);

-- ocr_itinerary_items policies
DROP POLICY IF EXISTS "Users can create itinerary items for their trips" ON ocr_itinerary_items;
DROP POLICY IF EXISTS "Users can view itinerary items for their trips" ON ocr_itinerary_items;
DROP POLICY IF EXISTS "Users can update itinerary items for their trips" ON ocr_itinerary_items;
DROP POLICY IF EXISTS "Users can delete itinerary items for their trips" ON ocr_itinerary_items;

CREATE POLICY "Users can create OCR itinerary items"
ON ocr_itinerary_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (
      users.role = 'admin'
      OR EXISTS (
        SELECT 1 FROM trip_assignments
        WHERE trip_assignments.trip_id = ocr_itinerary_items.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can view OCR itinerary items"
ON ocr_itinerary_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (
      users.role = 'admin'
      OR EXISTS (
        SELECT 1 FROM trip_assignments
        WHERE trip_assignments.trip_id = ocr_itinerary_items.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update OCR itinerary items"
ON ocr_itinerary_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (
      users.role = 'admin'
      OR EXISTS (
        SELECT 1 FROM trip_assignments
        WHERE trip_assignments.trip_id = ocr_itinerary_items.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (
      users.role = 'admin'
      OR EXISTS (
        SELECT 1 FROM trip_assignments
        WHERE trip_assignments.trip_id = ocr_itinerary_items.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete OCR itinerary items"
ON ocr_itinerary_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (
      users.role = 'admin'
      OR EXISTS (
        SELECT 1 FROM trip_assignments
        WHERE trip_assignments.trip_id = ocr_itinerary_items.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  )
);
