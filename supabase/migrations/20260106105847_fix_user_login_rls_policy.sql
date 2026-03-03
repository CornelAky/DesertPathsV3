/*
  # Fix User Login RLS Policy

  ## Overview
  Fix the users table RLS policy to allow users to read their own data during authentication.
  The previous policy was too restrictive and prevented login.

  ## Changes
  - Update the "Users can read own data" policy to always allow users to read their own record
  - This is necessary for Supabase Auth to function properly during login
  - Users will still be blocked from performing actions if they are deleted/inactive via other policies
*/

-- Fix the user read policy to allow users to always read their own data
-- This is essential for authentication to work properly
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Users can always read their own record (needed for auth)
    id = auth.uid() 
    -- Admins can read all users (for user management)
    OR EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.status = 'active'
      AND admin_user.deleted_at IS NULL
    )
  );

-- Note: Deleted/inactive users can read their own record but will be blocked
-- from accessing application data by the other RLS policies on journeys, customers, etc.
