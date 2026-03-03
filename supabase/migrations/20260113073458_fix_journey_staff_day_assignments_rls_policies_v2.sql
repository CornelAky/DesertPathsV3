/*
  # Fix RLS Policies for Journey Staff Day Assignments

  1. Changes
    - Add INSERT policy for journey_staff_day_assignments
    - Add UPDATE policy for journey_staff_day_assignments
    - Add DELETE policy for journey_staff_day_assignments

  2. Security
    - Users with edit permission on the journey can manage staff day assignments
    - Admins and managers can manage all staff day assignments
    - Journey creators can manage staff day assignments for their journeys
*/

-- Add INSERT policy for journey_staff_day_assignments
CREATE POLICY "Users can insert day assignments for journeys they can edit"
  ON journey_staff_day_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM journey_staff js
      JOIN journeys j ON js.journey_id = j.id
      JOIN itinerary_days d ON d.journey_id = j.id
      WHERE js.id = journey_staff_day_assignments.staff_id
        AND d.id = journey_staff_day_assignments.day_id
        AND (
          is_admin()
          OR j.created_by = auth.uid()
          OR has_edit_permission(j.id)
        )
    )
  );

-- Add UPDATE policy for journey_staff_day_assignments
CREATE POLICY "Users can update day assignments for journeys they can edit"
  ON journey_staff_day_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM journey_staff js
      JOIN journeys j ON js.journey_id = j.id
      JOIN itinerary_days d ON d.journey_id = j.id
      WHERE js.id = journey_staff_day_assignments.staff_id
        AND d.id = journey_staff_day_assignments.day_id
        AND (
          is_admin()
          OR j.created_by = auth.uid()
          OR has_edit_permission(j.id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM journey_staff js
      JOIN journeys j ON js.journey_id = j.id
      JOIN itinerary_days d ON d.journey_id = j.id
      WHERE js.id = journey_staff_day_assignments.staff_id
        AND d.id = journey_staff_day_assignments.day_id
        AND (
          is_admin()
          OR j.created_by = auth.uid()
          OR has_edit_permission(j.id)
        )
    )
  );

-- Add DELETE policy for journey_staff_day_assignments
CREATE POLICY "Users can delete day assignments for journeys they can edit"
  ON journey_staff_day_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM journey_staff js
      JOIN journeys j ON js.journey_id = j.id
      JOIN itinerary_days d ON d.journey_id = j.id
      WHERE js.id = journey_staff_day_assignments.staff_id
        AND d.id = journey_staff_day_assignments.day_id
        AND (
          is_admin()
          OR j.created_by = auth.uid()
          OR has_edit_permission(j.id)
        )
    )
  );
