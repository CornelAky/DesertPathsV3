/*
  # Fix Journey Delete Policies for Trash

  1. Changes
    - Ensure admins can delete journeys (including archived ones)
    - Update delete policy to allow permanent deletion from trash

  2. Security
    - Only admins and journey creators can delete
    - Maintain existing security constraints
*/

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Admins and creators can delete journeys" ON journeys;
DROP POLICY IF EXISTS "Users with edit permission can delete journey" ON journeys;

-- Create comprehensive delete policy
CREATE POLICY "Admins and creators can delete journeys"
  ON journeys
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.role = 'admin'
        OR journeys.created_by = auth.uid()
      )
      AND users.status = 'active'
    )
  );
