/*
  # Clean and Fix Journey RLS Policies

  1. Problem
    - Multiple overlapping SELECT policies causing confusion
    - Redundant checks and complex nested queries
    - Admin and guide visibility broken

  2. Solution
    - Drop all existing journey policies
    - Create single, clean policy for each operation (SELECT, INSERT, UPDATE, DELETE)
    - Use existing helper functions: is_admin(), has_journey_access()
    - Ensure SECURITY DEFINER is set on all helper functions

  3. Changes
    - Remove all redundant policies
    - Add single SELECT policy for all users (admins, creators, shared users, staff)
    - Add clear INSERT, UPDATE, DELETE policies
    - Fix helper functions to use SECURITY DEFINER
*/

-- ============================================
-- STEP 1: Drop all existing journey policies
-- ============================================

DROP POLICY IF EXISTS "Admins can view all journeys" ON journeys;
DROP POLICY IF EXISTS "Users can view assigned journeys" ON journeys;
DROP POLICY IF EXISTS "Authenticated users can create journeys" ON journeys;
DROP POLICY IF EXISTS "Guides can create driver copies" ON journeys;
DROP POLICY IF EXISTS "Admins can update all trips" ON journeys;
DROP POLICY IF EXISTS "Guides can update their driver copies" ON journeys;
DROP POLICY IF EXISTS "Creators can delete their journeys" ON journeys;
DROP POLICY IF EXISTS "Guides can delete their driver copies" ON journeys;

-- ============================================
-- STEP 2: Ensure helper function is correct
-- ============================================

-- Create or update the main access checking function
CREATE OR REPLACE FUNCTION public.can_view_journey(journey_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
  user_id_param uuid;
BEGIN
  user_id_param := auth.uid();
  
  -- No user authenticated
  IF user_id_param IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user role
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id_param
    AND status = 'active'
    AND deleted_at IS NULL;
  
  -- Admins can see everything
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user is the creator
  IF EXISTS (
    SELECT 1 FROM journeys
    WHERE id = journey_id_param
      AND created_by = user_id_param
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if journey is shared with user directly
  IF EXISTS (
    SELECT 1 FROM journey_shares
    WHERE journey_id = journey_id_param
      AND shared_with = user_id_param
      AND is_active = true
      AND revoked_at IS NULL
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if journey is shared with user via master_staff
  IF EXISTS (
    SELECT 1 FROM journey_shares js
    INNER JOIN master_staff ms ON js.master_staff_id = ms.id
    WHERE js.journey_id = journey_id_param
      AND ms.user_id = user_id_param
      AND js.is_active = true
      AND js.revoked_at IS NULL
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned as staff on this journey
  IF EXISTS (
    SELECT 1 FROM journey_staff jstaff
    INNER JOIN master_staff ms ON jstaff.master_staff_id = ms.id
    WHERE jstaff.journey_id = journey_id_param
      AND ms.user_id = user_id_param
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create or update the edit permission checking function
CREATE OR REPLACE FUNCTION public.can_edit_journey(journey_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
  user_id_param uuid;
BEGIN
  user_id_param := auth.uid();
  
  -- No user authenticated
  IF user_id_param IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user role
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id_param
    AND status = 'active'
    AND deleted_at IS NULL;
  
  -- Admins can edit everything
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user is the creator
  IF EXISTS (
    SELECT 1 FROM journeys
    WHERE id = journey_id_param
      AND created_by = user_id_param
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if journey is shared with edit permission (user directly)
  IF EXISTS (
    SELECT 1 FROM journey_shares
    WHERE journey_id = journey_id_param
      AND shared_with = user_id_param
      AND is_active = true
      AND revoked_at IS NULL
      AND permission_level = 'edit'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if journey is shared with edit permission (via master_staff)
  IF EXISTS (
    SELECT 1 FROM journey_shares js
    INNER JOIN master_staff ms ON js.master_staff_id = ms.id
    WHERE js.journey_id = journey_id_param
      AND ms.user_id = user_id_param
      AND js.is_active = true
      AND js.revoked_at IS NULL
      AND js.permission_level = 'edit'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- ============================================
-- STEP 3: Create clean, simple policies
-- ============================================

-- SELECT: Users can view journeys they have access to
CREATE POLICY "Users can view accessible journeys"
  ON journeys FOR SELECT
  TO authenticated
  USING (can_view_journey(id));

-- INSERT: Users can create journeys (admin or regular user creates with their ID)
CREATE POLICY "Authenticated users can create journeys"
  ON journeys FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR is_admin()
  );

-- UPDATE: Users can update journeys they can edit
CREATE POLICY "Users can update editable journeys"
  ON journeys FOR UPDATE
  TO authenticated
  USING (can_edit_journey(id))
  WITH CHECK (can_edit_journey(id));

-- DELETE: Admins and creators can delete journeys
CREATE POLICY "Users can delete their journeys"
  ON journeys FOR DELETE
  TO authenticated
  USING (
    is_admin()
    OR created_by = auth.uid()
  );