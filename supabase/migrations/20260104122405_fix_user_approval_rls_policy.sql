/*
  # Fix User Approval RLS Policy

  ## Problem
  The current UPDATE policy on the users table has a WITH CHECK clause that evaluates `is_admin()`,
  which checks if the RESULTING row (the user being updated) is an admin with active status.
  This prevents admins from approving pending users because the user being approved is not an admin.

  ## Solution
  Update the WITH CHECK clause to allow admins to update any user record, not just admin records.
  The WITH CHECK should verify that the person making the update is an admin, not that the
  user being updated is an admin.

  ## Changes
  - Drop existing "Admins can update all users" policy
  - Recreate with corrected WITH CHECK clause that allows updating any user
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Recreate with proper WITH CHECK that allows admins to update any user
CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    -- Admin must be active to perform updates
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  )
  WITH CHECK (
    -- Admin must be active to perform updates (checks the person doing the update, not the user being updated)
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );
