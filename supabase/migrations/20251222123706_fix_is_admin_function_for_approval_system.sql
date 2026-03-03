/*
  # Fix is_admin() Function for Approval System

  ## Overview
  Updates the is_admin() function to check for active status, ensuring only approved admins can perform admin actions.

  ## Changes
  - Update is_admin() function to check status = 'active'
  - Prevents pending/rejected admins from performing admin actions
*/

-- Drop and recreate is_admin function with status check
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
$$ LANGUAGE plpgsql SECURITY DEFINER;