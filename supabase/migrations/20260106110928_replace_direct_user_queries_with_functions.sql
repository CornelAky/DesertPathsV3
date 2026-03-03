/*
  # Replace Direct User Queries in RLS Policies

  ## Problem
  Many RLS policies across different tables directly query the users table
  like: EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  
  When these policies execute, they trigger users table RLS, which can cause
  infinite recursion when the users table policies also check admin status.

  ## Solution
  Create helper functions that bypass RLS and replace direct user queries
  in all RLS policies with calls to these functions.

  ## Changes
  1. Create helper functions with SECURITY DEFINER and row_security = off
  2. These functions will not be used in this migration, but will be available
     for future policy updates
  
  Note: This is part 1 - creating the functions. The actual policy updates
  should be done incrementally to avoid breaking existing functionality.
*/

-- Create helper function to check if current user has specific role
CREATE OR REPLACE FUNCTION public.user_has_role(check_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
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

-- Create helper function to check if current user has any of the specified roles
CREATE OR REPLACE FUNCTION public.user_has_any_role(check_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
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
  
  RETURN current_role = ANY(check_roles);
END;
$$;

-- Create helper to check if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
STABLE
AS $$
BEGIN
  RETURN user_has_any_role(ARRAY['admin', 'manager']);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_any_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin() TO authenticated;

-- Verify is_admin() is properly set up
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
