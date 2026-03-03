/*
  # Add delete policy for trips

  1. Changes
    - Add explicit DELETE policy for admins on trips table
    - Ensures admins can delete trips they own or manage

  2. Security
    - Only admins can delete trips
    - Maintains data integrity through existing CASCADE constraints
*/

-- Add explicit delete policy for admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trips' 
    AND policyname = 'Admins can delete trips'
  ) THEN
    CREATE POLICY "Admins can delete trips"
      ON trips
      FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;
