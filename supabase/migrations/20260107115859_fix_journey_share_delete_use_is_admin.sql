/*
  # Fix Journey Share Delete Policy to Use is_admin() Function

  1. Problem
    - Current policy queries users table directly causing potential RLS recursion
    - Direct query: (SELECT role FROM users WHERE id = auth.uid()) = 'admin'

  2. Solution
    - Use the is_admin() helper function which bypasses RLS
    - This prevents any potential recursion issues

  3. Changes
    - Recreate DELETE policy for journey_shares using is_admin() function
*/

-- Drop existing delete policies
DROP POLICY IF EXISTS "Admins can delete any journey share" ON journey_shares;
DROP POLICY IF EXISTS "Users can delete shares they received" ON journey_shares;

-- Admin delete policy using is_admin() function
CREATE POLICY "Admins can delete any journey share"
  ON journey_shares FOR DELETE
  TO authenticated
  USING (is_admin());

-- Users can delete shares they received
CREATE POLICY "Users can delete shares they received"
  ON journey_shares FOR DELETE
  TO authenticated
  USING (shared_with = auth.uid());
