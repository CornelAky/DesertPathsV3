/*
  # Add INSERT and UPDATE Policies for Itinerary Items

  1. New Policies
    - Add INSERT policies for activities, dining, and accommodations
    - Add UPDATE policies for activities and accommodations
    - All policies check edit permissions using has_edit_permission function

  2. Security
    - Users with edit permission can insert new items
    - Users with edit permission can update existing items
    - Maintains existing SELECT and DELETE policies
    - No changes to existing data

  Important Notes:
    - This fixes the "violates row-level security policy" error when duplicating
    - Allows activity duplication to work properly
    - Enables day duplication to work correctly
*/

-- =====================================================
-- ACTIVITIES TABLE POLICIES
-- =====================================================

-- Insert policy for activities
CREATE POLICY "Users with edit permission can insert activities"
  ON activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = activities.day_id
      AND has_edit_permission(d.journey_id)
    )
  );

-- Update policy for activities
CREATE POLICY "Users with edit permission can update activities"
  ON activities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = activities.day_id
      AND has_edit_permission(d.journey_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = activities.day_id
      AND has_edit_permission(d.journey_id)
    )
  );

-- =====================================================
-- DINING TABLE POLICIES
-- =====================================================

-- Insert policy for dining
CREATE POLICY "Users with edit permission can insert dining"
  ON dining
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = dining.day_id
      AND has_edit_permission(d.journey_id)
    )
  );

-- Update policy for dining (in addition to existing guide update policy)
CREATE POLICY "Users with edit permission can update dining"
  ON dining
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = dining.day_id
      AND has_edit_permission(d.journey_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = dining.day_id
      AND has_edit_permission(d.journey_id)
    )
  );

-- =====================================================
-- ACCOMMODATIONS TABLE POLICIES
-- =====================================================

-- Insert policy for accommodations
CREATE POLICY "Users with edit permission can insert accommodations"
  ON accommodations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = accommodations.day_id
      AND has_edit_permission(d.journey_id)
    )
  );

-- Update policy for accommodations
CREATE POLICY "Users with edit permission can update accommodations"
  ON accommodations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = accommodations.day_id
      AND has_edit_permission(d.journey_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = accommodations.day_id
      AND has_edit_permission(d.journey_id)
    )
  );
