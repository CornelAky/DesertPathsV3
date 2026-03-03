/*
  # Add DELETE policies for cascade deletion support

  1. Changes
    - Add DELETE policy to `itinerary_change_log` table for admins
    - Update DELETE policy on `itinerary_entry_comments` table to allow cascade deletes
    - These changes enable proper CASCADE deletion when trips are deleted
  
  2. Security
    - Only admins can trigger these deletes
    - Policies allow CASCADE delete operations to succeed through RLS
  
  3. Notes
    - Previously, `itinerary_change_log` had NO DELETE policy
    - `itinerary_entry_comments` only allowed deleting own comments, blocking CASCADE deletes
    - Without these policies, CASCADE deletes from trips fail due to RLS restrictions
*/

-- Add DELETE policy for itinerary_change_log
CREATE POLICY "Admins can delete change logs"
  ON itinerary_change_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Drop the restrictive DELETE policy on itinerary_entry_comments
DROP POLICY IF EXISTS "Admins can delete their own comments" ON itinerary_entry_comments;

-- Add a broader DELETE policy for itinerary_entry_comments that allows cascade deletes
CREATE POLICY "Admins can delete all comments"
  ON itinerary_entry_comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );