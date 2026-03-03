/*
  # Fix User RLS Without Recursion v2

  ## Overview
  The previous policy still has recursion issues. This migration creates
  completely non-recursive policies that will allow login to work.

  ## Changes
  - Remove all policies that could cause recursion
  - Create simple policies that don't query the users table within the policy
  - Use a function with SECURITY DEFINER to check admin status
*/

-- Create a secure function to check if current user is admin
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND status = 'active'
    AND deleted_at IS NULL
  );
$$;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read own or admin reads all" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can update own or admin updates any" ON users;
DROP POLICY IF EXISTS "Admins can soft delete users" ON users;

-- SELECT: Users can ALWAYS read their own record (needed for auth)
-- Admins can read all records via separate function
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR public.current_user_is_admin()
  );

-- INSERT: Users can only insert their own profile during signup
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE: Users can update their own profile OR admins can update any user
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR public.current_user_is_admin()
  )
  WITH CHECK (
    id = auth.uid()
    OR public.current_user_is_admin()
  );
