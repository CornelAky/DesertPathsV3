/*
  # Fix User Approval Infinite Recursion
  
  ## Problem
  The is_admin() function queries the users table, which triggers RLS policies
  that call is_admin() again, causing infinite recursion.
  
  ## Solution
  Make the is_admin() function truly bypass RLS by setting row_security to off
  within the function scope. This prevents the function from triggering RLS
  checks when querying the users table.
  
  ## Changes
  - Recreate is_admin() function with row_security disabled
  - This allows the function to query users table without triggering RLS
*/

-- Drop and recreate the is_admin function to truly bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
DECLARE
  result boolean;
BEGIN
  -- Temporarily disable RLS for this query
  PERFORM set_config('row_security', 'off', true);
  
  -- Check if user is an active admin
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.status = 'active'
  ) INTO result;
  
  -- Re-enable RLS
  PERFORM set_config('row_security', 'on', true);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;