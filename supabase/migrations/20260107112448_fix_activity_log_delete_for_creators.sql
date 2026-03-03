/*
  # Fix Activity Log Delete Policy

  1. Changes
    - Update delete policy for itinerary_activity_log
    - Allow journey creators to delete activity logs for their own journeys
    - Maintain admin access

  2. Security
    - Ensure only admins and journey creators can delete activity logs
*/

-- Update itinerary_activity_log delete policy to include creators
DROP POLICY IF EXISTS "Admins can delete activity logs" ON itinerary_activity_log;
CREATE POLICY "Admins and creators can delete activity logs"
  ON itinerary_activity_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = itinerary_activity_log.journey_id
      AND journeys.created_by = auth.uid()
    )
  );
