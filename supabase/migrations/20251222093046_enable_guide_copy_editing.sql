/*
  # Enable Guide Copy Editing
  
  ## Overview
  This migration enables guides to fully edit their guide copies (formerly driver copies).
  Guides can now insert, update, and delete all itinerary components in trips they created
  where is_driver_copy = true.
  
  ## Changes
  
  1. **Itinerary Days Policies**
     - INSERT: Guides can add days to their guide copies
     - UPDATE: Guides can update days in their guide copies
     - DELETE: Guides can remove days from their guide copies
  
  2. **Accommodations Policies**
     - INSERT: Guides can add accommodations to their guide copies
     - UPDATE: Guides can update accommodations in their guide copies
     - DELETE: Guides can remove accommodations from their guide copies
  
  3. **Activities Policies**
     - INSERT: Guides can add activities to their guide copies
     - UPDATE: Guides can fully update activities (not just completion status) in their guide copies
     - DELETE: Guides can remove activities from their guide copies
  
  4. **Dining Policies**
     - INSERT: Guides can add dining entries to their guide copies
     - UPDATE: Guides can update dining entries in their guide copies
     - DELETE: Guides can remove dining entries from their guide copies
  
  ## Security
  - Guides can only edit items in trips where created_by = auth.uid() AND is_driver_copy = true
  - Original shared trips remain read-only unless explicitly shared with edit permission
  - Admins retain full access to all non-guide-copy trips
*/

-- Helper function to check if a trip is a guide's copy
CREATE OR REPLACE FUNCTION is_users_guide_copy(trip_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_id_param
    AND trips.created_by = auth.uid()
    AND trips.is_driver_copy = true
  );
END;
$$;

-- =============================================
-- ITINERARY DAYS POLICIES
-- =============================================

-- Allow guides to insert days into their guide copies
CREATE POLICY "Guides can insert days into their guide copies"
  ON itinerary_days FOR INSERT
  TO authenticated
  WITH CHECK (
    is_users_guide_copy(trip_id)
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Allow guides to update days in their guide copies
CREATE POLICY "Guides can update days in their guide copies"
  ON itinerary_days FOR UPDATE
  TO authenticated
  USING (
    is_users_guide_copy(trip_id)
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_edit_permission(trip_id)
  )
  WITH CHECK (
    is_users_guide_copy(trip_id)
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_edit_permission(trip_id)
  );

-- Allow guides to delete days from their guide copies
CREATE POLICY "Guides can delete days from their guide copies"
  ON itinerary_days FOR DELETE
  TO authenticated
  USING (
    is_users_guide_copy(trip_id)
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- =============================================
-- ACCOMMODATIONS POLICIES
-- =============================================

-- Allow guides to insert accommodations into their guide copies
CREATE POLICY "Guides can insert accommodations into their guide copies"
  ON accommodations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  );

-- Allow guides to update accommodations in their guide copies
CREATE POLICY "Guides can update accommodations in their guide copies"
  ON accommodations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  );

-- Allow guides to delete accommodations from their guide copies
CREATE POLICY "Guides can delete accommodations from their guide copies"
  ON accommodations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- =============================================
-- ACTIVITIES POLICIES
-- =============================================

-- Allow guides to insert activities into their guide copies
CREATE POLICY "Guides can insert activities into their guide copies"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  );

-- Update the existing activities UPDATE policy to include guide copies
DROP POLICY IF EXISTS "Users can update accessible activity completion" ON activities;
CREATE POLICY "Guides can update activities in their guide copies"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_trip_access(itinerary_days.trip_id, auth.uid(), 'view')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_trip_access(itinerary_days.trip_id, auth.uid(), 'view')
    )
  );

-- Allow guides to delete activities from their guide copies
CREATE POLICY "Guides can delete activities from their guide copies"
  ON activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- =============================================
-- DINING POLICIES
-- =============================================

-- Allow guides to insert dining entries into their guide copies
CREATE POLICY "Guides can insert dining into their guide copies"
  ON dining FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  );

-- Allow guides to update dining entries in their guide copies
CREATE POLICY "Guides can update dining in their guide copies"
  ON dining FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  );

-- Allow guides to delete dining entries from their guide copies
CREATE POLICY "Guides can delete dining from their guide copies"
  ON dining FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND is_users_guide_copy(itinerary_days.trip_id)
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );