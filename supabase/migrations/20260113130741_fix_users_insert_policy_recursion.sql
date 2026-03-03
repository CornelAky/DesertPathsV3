/*
  # Fix Users Table INSERT Policy to Avoid Recursion

  1. Problem
    - "allow_admin_insert_all" policy has EXISTS subquery directly querying users table
    - This can cause infinite recursion with RLS policies
    
  2. Solution
    - Drop the problematic policy
    - Recreate using is_admin() function which bypasses RLS
    
  3. Security
    - Maintains same access control (admins can create users)
    - Uses RLS-safe helper function
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "allow_admin_insert_all" ON users;

-- Recreate using is_admin() function
CREATE POLICY "Admins can insert any user"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());
