/*
  # Fix is_admin Function to Properly Bypass RLS
  
  ## Problem
  Even though is_admin() is SECURITY DEFINER and owned by postgres (with BYPASSRLS),
  it still triggers RLS checks when querying the users table. This is because
  SECURITY DEFINER functions in PostgreSQL still respect RLS by default unless
  explicitly configured otherwise.
  
  ## Solution
  Add `SET row_security = off` configuration to the is_admin() function to
  explicitly tell PostgreSQL to bypass RLS when executing this function.
  
  ## Changes
  - Recreate is_admin() function with `SET row_security = off`
  - This ensures the function bypasses RLS when querying users table
*/

-- Drop and recreate the function with proper RLS bypass configuration
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
SET search_path = public, auth
SET row_security = off;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;