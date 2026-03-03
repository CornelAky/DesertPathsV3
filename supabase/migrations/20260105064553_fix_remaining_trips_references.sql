/*
  # Fix Remaining Trips to Journeys References

  1. Updates RLS Policies
    - Fix journey_gear policies referencing "trips" table
    - Fix transportation policies referencing "trips" table
    - Fix itinerary_entries comment policies
    - Fix other policies using trip_shares and trip_assignments

  2. Updates Functions
    - Fix is_driver_copy_owner function to use journeys table

  3. Security
    - All RLS policies updated to reference correct tables
    - No data loss, only policy updates
    - Maintains all existing permissions

  Important Notes:
    - This fixes the "relation trips does not exist" error
    - Ensures all policies work after trips->journeys rename
*/

-- =====================================================
-- 1. FIX JOURNEY_GEAR POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view trip gear" ON journey_gear;
CREATE POLICY "Users can view trip gear"
  ON journey_gear
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_gear.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM journey_shares
          WHERE journey_shares.journey_id = journeys.id
          AND journey_shares.shared_with = auth.uid()
          AND journey_shares.is_active = true
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can add trip gear" ON journey_gear;
CREATE POLICY "Users can add trip gear"
  ON journey_gear
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_gear.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR has_edit_permission(journeys.id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can update trip gear" ON journey_gear;
CREATE POLICY "Users can update trip gear"
  ON journey_gear
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_gear.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR has_edit_permission(journeys.id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_gear.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR has_edit_permission(journeys.id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete trip gear" ON journey_gear;
CREATE POLICY "Users can delete trip gear"
  ON journey_gear
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_gear.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR has_edit_permission(journeys.id)
      )
    )
  );

-- =====================================================
-- 2. FIX TRANSPORTATION POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users with trip access can view transportation" ON transportation;
CREATE POLICY "Users with trip access can view transportation"
  ON transportation
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN journeys j ON j.id = d.journey_id
      JOIN journey_shares js ON js.journey_id = j.id
      WHERE d.id = transportation.day_id
      AND js.shared_with = auth.uid()
      AND js.is_active = true
    )
  );

DROP POLICY IF EXISTS "Driver copy owners can view their transportation" ON transportation;
CREATE POLICY "Driver copy owners can view their transportation"
  ON transportation
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN journeys j ON j.id = d.journey_id
      WHERE d.id = transportation.day_id
      AND j.created_by = auth.uid()
      AND j.is_driver_copy = true
    )
  );

DROP POLICY IF EXISTS "Driver copy owners can add transportation" ON transportation;
CREATE POLICY "Driver copy owners can add transportation"
  ON transportation
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN journeys j ON j.id = d.journey_id
      WHERE d.id = transportation.day_id
      AND j.created_by = auth.uid()
      AND j.is_driver_copy = true
    )
  );

DROP POLICY IF EXISTS "Driver copy owners can update their transportation" ON transportation;
CREATE POLICY "Driver copy owners can update their transportation"
  ON transportation
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN journeys j ON j.id = d.journey_id
      WHERE d.id = transportation.day_id
      AND j.created_by = auth.uid()
      AND j.is_driver_copy = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN journeys j ON j.id = d.journey_id
      WHERE d.id = transportation.day_id
      AND j.created_by = auth.uid()
      AND j.is_driver_copy = true
    )
  );

DROP POLICY IF EXISTS "Driver copy owners can delete their transportation" ON transportation;
CREATE POLICY "Driver copy owners can delete their transportation"
  ON transportation
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN journeys j ON j.id = d.journey_id
      WHERE d.id = transportation.day_id
      AND j.created_by = auth.uid()
      AND j.is_driver_copy = true
    )
  );

DROP POLICY IF EXISTS "Editors can manage transportation" ON transportation;
CREATE POLICY "Editors can manage transportation"
  ON transportation
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN journeys j ON j.id = d.journey_id
      WHERE d.id = transportation.day_id
      AND has_edit_permission(j.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN journeys j ON j.id = d.journey_id
      WHERE d.id = transportation.day_id
      AND has_edit_permission(j.id)
    )
  );

-- =====================================================
-- 3. FIX ITINERARY_ENTRIES COMMENT POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view comments on shared itinerary entries" ON itinerary_entry_comments;
CREATE POLICY "Users can view comments on shared itinerary entries"
  ON itinerary_entry_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_entries ie
      JOIN journeys j ON ie.journey_id = j.id
      JOIN journey_assignments ja ON ja.journey_id = j.id
      WHERE ie.id = entry_id
      AND ja.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add comments to itinerary entries" ON itinerary_entry_comments;
CREATE POLICY "Users can add comments to itinerary entries"
  ON itinerary_entry_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    visibility = 'all'
    AND EXISTS (
      SELECT 1 FROM itinerary_entries ie
      JOIN journeys j ON ie.journey_id = j.id
      JOIN journey_assignments ja ON ja.journey_id = j.id
      WHERE ie.id = entry_id
      AND ja.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. FIX IS_DRIVER_COPY_OWNER FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS is_driver_copy_owner(uuid);
CREATE OR REPLACE FUNCTION is_driver_copy_owner(journey_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM journeys
    WHERE journeys.id = journey_id_param
    AND journeys.created_by = auth.uid()
    AND journeys.is_driver_copy = true
  );
END;
$$;

-- =====================================================
-- 5. FIX APPROVED USERS VIEWING TRIPS POLICY
-- =====================================================

DROP POLICY IF EXISTS "Approved users can view trips assigned to them" ON journeys;
CREATE POLICY "Approved users can view trips assigned to them"
  ON journeys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND status = 'approved'
    )
    AND (
      EXISTS (
        SELECT 1 FROM journey_assignments
        WHERE journey_assignments.journey_id = journeys.id
        AND journey_assignments.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM journey_shares
        WHERE journey_shares.journey_id = journeys.id
        AND journey_shares.shared_with = auth.uid()
        AND journey_shares.is_active = true
      )
    )
  );

-- =====================================================
-- 6. ENSURE DELETE POLICIES EXIST FOR ACTIVITIES, DINING, ACCOMMODATIONS
-- =====================================================

-- Activities delete policy
DROP POLICY IF EXISTS "Users with edit permission can delete activities" ON activities;
CREATE POLICY "Users with edit permission can delete activities"
  ON activities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = activities.day_id
      AND has_edit_permission(d.journey_id)
    )
  );

-- Dining delete policy
DROP POLICY IF EXISTS "Users with edit permission can delete dining" ON dining;
CREATE POLICY "Users with edit permission can delete dining"
  ON dining
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = dining.day_id
      AND has_edit_permission(d.journey_id)
    )
  );

-- Accommodations delete policy
DROP POLICY IF EXISTS "Users with edit permission can delete accommodations" ON accommodations;
CREATE POLICY "Users with edit permission can delete accommodations"
  ON accommodations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = accommodations.day_id
      AND has_edit_permission(d.journey_id)
    )
  );
