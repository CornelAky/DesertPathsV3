/*
  # Add DELETE policy for itinerary_activity_log

  1. Changes
    - Add DELETE policy to `itinerary_activity_log` table to allow admins to delete activity logs
    - This fixes the foreign key constraint violation when deleting trips with activity logs
  
  2. Security
    - Only admins can delete activity logs
    - This enables CASCADE delete from trips to work properly

  3. Notes
    - Previously, there was no DELETE policy on itinerary_activity_log
    - This caused CASCADE deletes from trips table to fail due to RLS blocking the delete operation
*/

-- Add DELETE policy for admins
CREATE POLICY "Admins can delete activity logs"
  ON itinerary_activity_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );