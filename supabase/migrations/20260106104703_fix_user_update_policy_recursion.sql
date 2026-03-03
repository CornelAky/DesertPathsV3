/*
  # Fix User Update Policy Infinite Recursion
  
  ## Problem
  The "Admins can update all users" policy is directly querying the users table
  in its USING clause, which causes infinite recursion when RLS checks trigger
  the policy, which queries users, which triggers RLS, etc.
  
  ## Solution
  1. Drop the problematic UPDATE policy that directly queries users table
  2. Recreate it to use the is_admin() function instead
  3. Ensure is_admin() is a SECURITY DEFINER function that bypasses RLS
  
  ## Changes
  - Drop existing "Admins can update all users" policy
  - Recreate policy using is_admin() function (consistent with other policies)
  - Recreate is_admin() function to ensure it properly bypasses RLS
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Recreate the is_admin function with proper RLS bypass
-- SECURITY DEFINER functions run with the privileges of the function owner
-- When owned by postgres (superuser), they bypass RLS automatically
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.status = 'active'
  );
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Recreate the UPDATE policy using is_admin() function
-- This prevents recursion because is_admin() bypasses RLS when querying users
CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());