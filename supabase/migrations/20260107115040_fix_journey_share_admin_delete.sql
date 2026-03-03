/*
  # Fix Journey Share Admin Delete Permission

  1. Changes
    - Add admin delete policy for journey_shares to allow admins to remove any share
    - Users can still delete shares where they are the shared_with user

  2. Security
    - Admins can delete ANY journey share
    - Regular users can only delete shares where they are the recipient (shared_with)
*/

-- Drop existing delete policy to recreate comprehensively
DROP POLICY IF EXISTS "Admins can delete trip shares" ON journey_shares;
DROP POLICY IF EXISTS "Admins can delete journey shares" ON journey_shares;
DROP POLICY IF EXISTS "Users can delete their own shares" ON journey_shares;

-- Allow admins to delete any share
CREATE POLICY "Admins can delete any journey share"
  ON journey_shares FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Allow users to delete shares where they are the recipient
CREATE POLICY "Users can delete shares they received"
  ON journey_shares FOR DELETE
  TO authenticated
  USING (
    shared_with = auth.uid()
  );
