/*
  # Prevent Deleting Last Admin

  ## Overview
  This migration prevents administrators from accidentally locking themselves out
  of the application by deleting the last admin account.

  ## Changes
  
  1. New Helper Function
    - `is_last_admin(user_id uuid)` - Returns true if the specified user is the only admin
    
  2. Updated RLS Policy
    - Modified "Admins can delete users" policy to prevent deletion of the last admin
    - Admins can delete any user EXCEPT if that user is the last admin in the system
  
  ## Security Notes
  - Ensures at least one admin account always exists
  - Prevents accidental lockout from the application
  - Maintains existing admin privileges for all other operations
*/

-- Create helper function to check if a user is the last admin
CREATE OR REPLACE FUNCTION is_last_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if the user is an admin AND is the only admin
  RETURN (
    SELECT role = 'admin' 
    FROM users 
    WHERE id = user_id
  ) AND (
    SELECT COUNT(*) = 1 
    FROM users 
    WHERE role = 'admin'
  );
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Recreate the delete policy with protection for last admin
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    is_admin() AND NOT is_last_admin(users.id)
  );
