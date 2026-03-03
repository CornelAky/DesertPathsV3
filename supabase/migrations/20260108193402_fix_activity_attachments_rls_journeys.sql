/*
  # Fix Activity Attachments RLS Policies

  1. Changes
    - Drop old activity_attachments policies that reference 'trips' table
    - Create new policies that reference 'journeys' table (correct table name)
    - Ensures document uploads work correctly
  
  2. Security
    - SELECT: Users can view attachments for activities they have access to
    - INSERT: Users can insert attachments if they have edit permission
    - DELETE: Users can delete attachments if they have edit permission
*/

-- Drop old policies
DROP POLICY IF EXISTS "Users can view attachments for activities they have access to" ON activity_attachments;
DROP POLICY IF EXISTS "Users can insert attachments if they have edit permission" ON activity_attachments;
DROP POLICY IF EXISTS "Users can delete attachments if they have edit permission" ON activity_attachments;

-- Create new policies with correct table references
CREATE POLICY "Users can view attachments for activities they have access to"
  ON activity_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN itinerary_days d ON a.day_id = d.id
      JOIN journeys t ON d.journey_id = t.id
      WHERE a.id = activity_attachments.activity_id
      AND (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'guide'))
        OR EXISTS (SELECT 1 FROM journey_shares WHERE journey_id = t.id AND shared_with = auth.uid())
        OR t.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert attachments if they have edit permission"
  ON activity_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN itinerary_days d ON a.day_id = d.id
      JOIN journeys t ON d.journey_id = t.id
      WHERE a.id = activity_id
      AND has_edit_permission(t.id)
    )
  );

CREATE POLICY "Users can delete attachments if they have edit permission"
  ON activity_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN itinerary_days d ON a.day_id = d.id
      JOIN journeys t ON d.journey_id = t.id
      WHERE a.id = activity_id
      AND has_edit_permission(t.id)
    )
  );