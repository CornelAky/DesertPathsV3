/*
  # Fix Infinite Recursion by Adding SECURITY DEFINER

  1. Problem
    - The `is_users_guide_copy()` function queries the `journeys` table
    - When called from a journeys RLS policy, this creates infinite recursion
    - Similarly, `is_admin()` and `user_has_role()` query `users` table

  2. Solution
    - Recreate functions with SECURITY DEFINER to bypass RLS
    - This allows them to execute their queries without triggering RLS policies
    - Safe because they only return boolean permission checks

  3. Changes
    - Add SECURITY DEFINER to all permission-checking functions
*/

-- Recreate is_admin with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  SELECT (role = 'admin' AND status = 'active' AND deleted_at IS NULL)
  INTO is_admin_user
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin_user, false);
END;
$$;

-- Recreate user_has_role with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION user_has_role(check_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role
  FROM users
  WHERE id = auth.uid()
    AND status = 'active'
    AND deleted_at IS NULL;
  
  RETURN current_role = check_role;
END;
$$;

-- Recreate is_users_guide_copy with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_users_guide_copy(trip_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM journeys
    WHERE journeys.id = trip_id_param
      AND journeys.created_by = auth.uid()
      AND journeys.is_driver_copy = true
  );
END;
$$;