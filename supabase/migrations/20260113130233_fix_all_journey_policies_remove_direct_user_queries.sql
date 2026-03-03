/*
  # Fix All Journey Policies to Avoid Infinite Recursion

  1. Problem
    - Multiple policies directly query users table in USING/WITH CHECK clauses
    - This causes infinite recursion with users table RLS policies
    - Policies affected:
      - "Admins can manage all journeys" (ALL)
      - "Authenticated users can create trips" (INSERT)
      - "Guides can create driver copies" (INSERT)
      - "Users can delete their own trips" (DELETE)
      - "Admins and creators can delete journeys" (DELETE)
      - "Approved users can view trips assigned to them" (SELECT)
      - "Guides can view assigned trips" (SELECT)
      - "Guides can view shared journeys" (SELECT)

  2. Solution
    - Drop all problematic policies
    - Recreate using helper functions that bypass RLS
    - Use is_admin(), has_staff_permission() functions

  3. Security
    - Maintain same access control rules
    - Use functions with SET row_security = off
*/

-- Drop all problematic policies
DROP POLICY IF EXISTS "Admins can manage all journeys" ON journeys;
DROP POLICY IF EXISTS "Authenticated users can create trips" ON journeys;
DROP POLICY IF EXISTS "Guides can create driver copies" ON journeys;
DROP POLICY IF EXISTS "Users can delete their own trips" ON journeys;
DROP POLICY IF EXISTS "Admins and creators can delete journeys" ON journeys;
DROP POLICY IF EXISTS "Approved users can view trips assigned to them" ON journeys;
DROP POLICY IF EXISTS "Guides can view assigned trips" ON journeys;
DROP POLICY IF EXISTS "Guides can view shared journeys" ON journeys;

-- Recreate policies using helper functions

-- INSERT policies
CREATE POLICY "Authenticated users can create journeys"
  ON journeys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() OR is_admin()
  );

CREATE POLICY "Guides can create driver copies"
  ON journeys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_driver_copy = true 
    AND created_by = auth.uid()
    AND user_has_role('guide')
  );

-- SELECT policies (kept existing good ones, just recreating for consistency)
-- Admin select policy already fixed
-- Keep: "Admins can view all journeys" (uses is_admin())

CREATE POLICY "Users can view assigned journeys"
  ON journeys
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user has journey assignment
    EXISTS (
      SELECT 1 FROM journey_assignments
      WHERE journey_assignments.journey_id = journeys.id
      AND journey_assignments.user_id = auth.uid()
    )
    OR
    -- Check if user has active share
    EXISTS (
      SELECT 1 FROM journey_shares
      WHERE journey_shares.journey_id = journeys.id
      AND journey_shares.shared_with = auth.uid()
      AND journey_shares.is_active = true
      AND journey_shares.revoked_at IS NULL
    )
    OR
    -- Check if user is assigned as staff
    EXISTS (
      SELECT 1 FROM journey_staff js
      JOIN master_staff ms ON ms.id = js.master_staff_id
      WHERE js.journey_id = journeys.id
      AND ms.user_id = auth.uid()
    )
    OR
    -- Check if it's user's guide copy
    is_users_guide_copy(journeys.id)
  );

-- UPDATE policies (keep existing good one)
-- Keep: "Admins can update all trips" (uses is_admin())
-- Keep: "Guides can update their driver copies"

-- DELETE policies
CREATE POLICY "Creators can delete their journeys"
  ON journeys
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR is_admin()
  );

-- Keep: "Guides can delete their driver copies" (good, no user table query)
