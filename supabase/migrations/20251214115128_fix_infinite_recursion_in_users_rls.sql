/*
  # Fix Infinite Recursion in Users RLS Policies

  ## Problem
  The "Admins can manage all users" policy was checking the users table
  within its own policy, causing infinite recursion during INSERT operations.

  ## Solution
  1. Create a SECURITY DEFINER function that bypasses RLS to check admin status
  2. Replace the recursive policy with one that uses this function
  3. Keep the policy allowing users to create their own profile during signup

  ## Changes
  - Drop existing problematic policy
  - Create `is_admin()` function with SECURITY DEFINER
  - Create new admin management policy using the function
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Create a SECURITY DEFINER function to check if current user is admin
-- This function bypasses RLS to prevent recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create separate policies for admins
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (is_admin());
