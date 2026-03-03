/*
  # Fix Permission Functions to Bypass RLS

  ## Problem
  The has_edit_permission and has_staff_edit_permission functions query
  the users table without bypassing RLS, which can cause infinite recursion
  when those functions are called from within RLS policies.

  ## Solution
  Add `SET row_security = off` to all permission-checking functions that
  query the users table. This ensures they bypass RLS and prevent recursion.

  ## Changes
  - Update has_edit_permission() to bypass RLS
  - Update has_staff_edit_permission() to bypass RLS
  - Update is_user_active() if it exists
*/

-- Fix has_edit_permission to bypass RLS
CREATE OR REPLACE FUNCTION has_edit_permission(journey_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
  is_creator boolean;
  has_share boolean;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM journeys 
    WHERE id = journey_id 
    AND created_by = auth.uid()
  ) INTO is_creator;
  
  IF is_creator THEN
    RETURN true;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM journey_shares 
    WHERE journey_shares.journey_id = has_edit_permission.journey_id 
    AND shared_with = auth.uid() 
    AND permission IN ('edit', 'admin')
  ) INTO has_share;
  
  RETURN has_share;
END;
$$;

-- Fix has_staff_edit_permission to bypass RLS
CREATE OR REPLACE FUNCTION has_staff_edit_permission(staff_journey_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  
  IF user_role IN ('admin', 'manager') THEN
    RETURN true;
  END IF;
  
  RETURN has_edit_permission(staff_journey_id);
END;
$$;

-- Create or update is_user_active function to bypass RLS
CREATE OR REPLACE FUNCTION is_user_active(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND status = 'active'
    AND deleted_at IS NULL
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION has_edit_permission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION has_staff_edit_permission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_active(uuid) TO authenticated;
