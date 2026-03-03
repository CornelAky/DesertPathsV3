/*
  # Fix Journey Staff Insert Policy

  1. Changes
    - Drop and recreate INSERT policy for journey_staff to use journey_id instead of trip_id
    - This was causing "Failed to assign staff to trip" error

  2. Reason
    - The policy was still referencing trip_id column which was renamed to journey_id
    - The has_staff_edit_permission function was updated but the policies weren't
*/

-- Drop old INSERT policy
DROP POLICY IF EXISTS "Users can insert staff if they have edit permission" ON journey_staff;

-- Recreate INSERT policy with correct column name
CREATE POLICY "Users can insert staff if they have edit permission"
  ON journey_staff FOR INSERT
  TO authenticated
  WITH CHECK (has_staff_edit_permission(journey_id));

-- Also fix UPDATE and DELETE policies to use journey_id
DROP POLICY IF EXISTS "Users can update staff if they have edit permission" ON journey_staff;
CREATE POLICY "Users can update staff if they have edit permission"
  ON journey_staff FOR UPDATE
  TO authenticated
  USING (has_staff_edit_permission(journey_id))
  WITH CHECK (has_staff_edit_permission(journey_id));

DROP POLICY IF EXISTS "Users can delete staff if they have edit permission" ON journey_staff;
DROP POLICY IF EXISTS "Admins and creators can delete journey staff" ON journey_staff;
CREATE POLICY "Users can delete staff if they have edit permission"
  ON journey_staff FOR DELETE
  TO authenticated
  USING (has_staff_edit_permission(journey_id));

-- Fix SELECT policy to use journey_id
DROP POLICY IF EXISTS "Users can view staff for trips they have access to" ON journey_staff;
CREATE POLICY "Users can view staff for journeys they have access to"
  ON journey_staff FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'guide')
    )
    OR EXISTS (
      SELECT 1 FROM journey_shares
      WHERE journey_id = journey_staff.journey_id
      AND shared_with = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM journeys
      WHERE id = journey_staff.journey_id
      AND created_by = auth.uid()
    )
  );
