/*
  # Fix User RLS Without Recursion - Keep Existing Functions

  ## Overview
  Fix the infinite recursion in users table RLS policies while keeping
  the functions that other tables depend on.

  ## Changes
  1. Recreate is_admin() function with SECURITY DEFINER to bypass RLS
  2. Drop and recreate all users table policies to be non-recursive
  3. Keep function names that other tables depend on

  ## Security
  - Users can read/update their own profile
  - Admins can read/update/delete all users (except delete themselves)
  - No recursion or circular dependencies
*/

-- Recreate is_admin() function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  -- Direct query that bypasses RLS because of SECURITY DEFINER
  SELECT (role = 'admin' AND status = 'active' AND deleted_at IS NULL)
  INTO is_admin_user
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin_user, false);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Drop ALL existing policies on users table only
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can update own or admin updates any" ON users;
DROP POLICY IF EXISTS "Admins can soft delete users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Admins can delete users except themselves" ON users;

-- Drop the conflicting function if it exists
DROP FUNCTION IF EXISTS public.current_user_is_admin();

-- Create simple, non-recursive policies for users table

-- SELECT: Users read own profile OR admins read all
CREATE POLICY "Users read own profile" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins read all users" ON users
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT: Only during signup
CREATE POLICY "Users insert own profile" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE: Users update own OR admins update any
CREATE POLICY "Users update own profile" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins update any user" ON users
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Only admins, and not themselves
CREATE POLICY "Admins delete users" ON users
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin() 
    AND id != auth.uid()
  );
