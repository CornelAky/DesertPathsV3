/*
  # Fix Journey Share Delete Permissions

  1. Changes
    - Add DELETE policy for users to remove shares from their own shared journeys
    - Allows users to delete journey_shares where they are the `shared_with` user
  
  2. Security
    - Users can only delete shares that belong to them (shared_with = their user id)
    - Admins retain ability to delete any shares
*/

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Users can delete their own shares" ON journey_shares;

-- Allow users to delete shares where they are the shared_with user
CREATE POLICY "Users can delete their own shares"
  ON journey_shares FOR DELETE
  TO authenticated
  USING (shared_with = auth.uid());