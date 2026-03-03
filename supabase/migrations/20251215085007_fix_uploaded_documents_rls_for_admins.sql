/*
  # Fix uploaded_documents RLS policies for admin access

  1. Changes
    - Update INSERT policy to allow admins to upload documents to any trip
    - Update SELECT policy to allow admins to view all documents
    - Update UPDATE policy to allow admins to update all documents
    - Update DELETE policy to allow admins to delete all documents
    - Keep existing policies for guides (users assigned to trips)

  2. Security
    - Admins have full access to all uploaded_documents
    - Guides can only access documents for trips they're assigned to
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload documents for their assigned trips" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can view documents for their assigned trips" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can update documents for their assigned trips" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can delete documents for their assigned trips" ON uploaded_documents;

-- INSERT: Admins can upload to any trip, guides to assigned trips
CREATE POLICY "Users can upload documents"
ON uploaded_documents
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
        WHERE trip_assignments.trip_id = uploaded_documents.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  )
);

-- SELECT: Admins can view all, guides can view assigned trips
CREATE POLICY "Users can view documents"
ON uploaded_documents
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
        WHERE trip_assignments.trip_id = uploaded_documents.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  )
);

-- UPDATE: Admins can update all, guides can update assigned trips
CREATE POLICY "Users can update documents"
ON uploaded_documents
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
        WHERE trip_assignments.trip_id = uploaded_documents.trip_id
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
        WHERE trip_assignments.trip_id = uploaded_documents.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  )
);

-- DELETE: Admins can delete all, guides can delete assigned trips
CREATE POLICY "Users can delete documents"
ON uploaded_documents
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
        WHERE trip_assignments.trip_id = uploaded_documents.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  )
);
