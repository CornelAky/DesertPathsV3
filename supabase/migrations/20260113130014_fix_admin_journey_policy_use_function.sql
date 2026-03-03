/*
  # Fix Admin Journey Policy to Use is_admin() Function

  1. Problem
    - Current admin policy directly queries users table in USING clause
    - This causes infinite recursion with users table RLS policies
    - Even though is_admin() function bypasses RLS, direct queries don't

  2. Solution
    - Drop the problematic policy
    - Recreate it using the is_admin() helper function instead
    - The is_admin() function has SET row_security = off, so it bypasses RLS

  3. Security
    - Only authenticated users with role='admin' can see all journeys
    - Function properly checks user status and role
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all journeys" ON journeys;

-- Recreate using the is_admin() helper function
CREATE POLICY "Admins can view all journeys"
  ON journeys
  FOR SELECT
  TO authenticated
  USING (is_admin());
