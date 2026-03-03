/*
  # Fix Journey Visibility for Staff Members

  1. Problem
    - Staff members assigned to journeys via journey_staff table cannot see the journeys
    - RLS policies only check journey_shares and journey_assignments tables
    - journey_staff table is not being checked for access

  2. Solution
    - Update journeys RLS SELECT policies to also check journey_staff table
    - Staff members linked via master_staff.user_id should see journeys they're assigned to
    - Maintain existing security checks (status, revoked, etc.)

  3. Changes
    - Drop and recreate "Guides can view shared journeys" policy with journey_staff check
    - Drop and recreate "Guides can view assigned trips" policy with journey_staff check
*/

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Guides can view shared journeys" ON journeys;
DROP POLICY IF EXISTS "Guides can view assigned trips" ON journeys;

-- Recreate "Guides can view shared journeys" with journey_staff support
CREATE POLICY "Guides can view shared journeys"
  ON journeys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.status = 'active'
      AND users.deleted_at IS NULL
    )
    AND (
      -- Can view if shared via journey_shares
      EXISTS (
        SELECT 1 FROM journey_shares
        WHERE journey_shares.journey_id = journeys.id
        AND journey_shares.shared_with = auth.uid()
        AND journey_shares.is_active = true
        AND journey_shares.revoked_at IS NULL
      )
      -- Can view if assigned as staff via journey_staff -> master_staff -> user_id
      OR EXISTS (
        SELECT 1 FROM journey_staff js
        INNER JOIN master_staff ms ON ms.id = js.master_staff_id
        WHERE js.journey_id = journeys.id
        AND ms.user_id = auth.uid()
      )
      -- Can view if it's their guide copy
      OR is_users_guide_copy(id)
    )
  );

-- Recreate "Guides can view assigned trips" with journey_staff support
CREATE POLICY "Guides can view assigned trips"
  ON journeys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.status = 'active'
    )
    AND (
      -- Can view if assigned via journey_assignments
      EXISTS (
        SELECT 1 FROM journey_assignments
        WHERE journey_assignments.journey_id = journeys.id
        AND journey_assignments.user_id = auth.uid()
      )
      -- Can view if shared via journey_shares
      OR EXISTS (
        SELECT 1 FROM journey_shares
        WHERE journey_shares.journey_id = journeys.id
        AND journey_shares.shared_with = auth.uid()
        AND journey_shares.is_active = true
        AND journey_shares.revoked_at IS NULL
      )
      -- Can view if assigned as staff via journey_staff -> master_staff -> user_id
      OR EXISTS (
        SELECT 1 FROM journey_staff js
        INNER JOIN master_staff ms ON ms.id = js.master_staff_id
        WHERE js.journey_id = journeys.id
        AND ms.user_id = auth.uid()
      )
    )
  );
