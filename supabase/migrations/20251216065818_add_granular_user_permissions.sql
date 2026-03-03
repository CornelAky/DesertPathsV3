/*
  # Add Granular User Permissions System
  
  ## Summary
  This migration enhances the permission system to give managers/admins full control over editing permissions on a per-user basis.
  
  ## Changes Made
  
  ### 1. Enhance trip_shares Table
    - The existing `trip_shares` table already has `permission_level` ('view' or 'edit')
    - Update RLS policies to ensure only admins can modify permissions
    - Add policies to ensure users can only edit if they have 'edit' permission
  
  ### 2. New Policies for Data Protection
    - Only admins can update trips, accommodations, activities, and dining by default
    - Users with 'edit' permission on a specific trip can also edit
    - Users with 'view' permission can only read data
  
  ### 3. Update RLS Policies for All Main Tables
    - trips
    - itinerary_days
    - accommodations
    - activities
    - dining
    - itinerary_entries
  
  ## Security
    - Admins have full control over all data
    - Users can only edit data for trips they have explicit 'edit' permission for
    - By default, non-admin users cannot edit anything unless granted permission
*/

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has edit permission for a trip
CREATE OR REPLACE FUNCTION has_edit_permission(trip_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trip_shares
    WHERE trip_shares.trip_id = trip_id_param
    AND trip_shares.shared_with = auth.uid()
    AND trip_shares.permission_level = 'edit'
    AND trip_shares.is_active = true
    AND (trip_shares.revoked_at IS NULL OR trip_shares.revoked_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trip_shares policies to ensure only admins can grant/revoke permissions
DROP POLICY IF EXISTS "Admins can manage all trip shares" ON trip_shares;
DROP POLICY IF EXISTS "Users can view their own shares" ON trip_shares;

CREATE POLICY "Admins can manage all trip shares"
  ON trip_shares FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can view their own shares"
  ON trip_shares FOR SELECT
  TO authenticated
  USING (shared_with = auth.uid());

-- Update trips table policies
DROP POLICY IF EXISTS "Admins can update all trips" ON trips;
DROP POLICY IF EXISTS "Users with edit permission can update trips" ON trips;

CREATE POLICY "Admins can update all trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users with edit permission can update trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (has_edit_permission(id))
  WITH CHECK (has_edit_permission(id));

-- Update itinerary_days table policies
DROP POLICY IF EXISTS "Admins can manage all itinerary days" ON itinerary_days;
DROP POLICY IF EXISTS "Users with edit permission can manage itinerary days" ON itinerary_days;

CREATE POLICY "Admins can manage all itinerary days"
  ON itinerary_days FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users with edit permission can manage itinerary days"
  ON itinerary_days FOR ALL
  TO authenticated
  USING (has_edit_permission(trip_id))
  WITH CHECK (has_edit_permission(trip_id));

-- Update accommodations table policies
DROP POLICY IF EXISTS "Admins can manage all accommodations" ON accommodations;
DROP POLICY IF EXISTS "Users with edit permission can manage accommodations" ON accommodations;

CREATE POLICY "Admins can manage all accommodations"
  ON accommodations FOR ALL
  TO authenticated
  USING (
    is_admin()
  )
  WITH CHECK (
    is_admin()
  );

CREATE POLICY "Users with edit permission can manage accommodations"
  ON accommodations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  );

-- Update activities table policies
DROP POLICY IF EXISTS "Admins can manage all activities" ON activities;
DROP POLICY IF EXISTS "Users with edit permission can manage activities" ON activities;

CREATE POLICY "Admins can manage all activities"
  ON activities FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users with edit permission can manage activities"
  ON activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  );

-- Update dining table policies
DROP POLICY IF EXISTS "Admins can manage all dining" ON dining;
DROP POLICY IF EXISTS "Users with edit permission can manage dining" ON dining;

CREATE POLICY "Admins can manage all dining"
  ON dining FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users with edit permission can manage dining"
  ON dining FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = day_id
      AND has_edit_permission(itinerary_days.trip_id)
    )
  );

-- Update itinerary_entries table policies
DROP POLICY IF EXISTS "Admins can manage all itinerary entries" ON itinerary_entries;
DROP POLICY IF EXISTS "Users with edit permission can manage itinerary entries" ON itinerary_entries;

CREATE POLICY "Admins can manage all itinerary entries"
  ON itinerary_entries FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users with edit permission can manage itinerary entries"
  ON itinerary_entries FOR ALL
  TO authenticated
  USING (has_edit_permission(trip_id))
  WITH CHECK (has_edit_permission(trip_id));
