/*
  # Fix Users RLS Using Function Correctly

  ## Problem
  Previous migration still had subqueries on users table within users policies,
  which causes recursion. We need to use the is_admin() function which properly
  bypasses RLS with SECURITY DEFINER and row_security = off.

  ## Solution
  Use the is_admin() function consistently in all policies. This function is
  safe because it has:
  - SECURITY DEFINER: runs with privileges of function owner
  - SET row_security = off: explicitly bypasses RLS
  - STABLE: tells PostgreSQL it won't cause side effects

  ## Changes
  - Drop policies with subqueries
  - Create policies that use is_admin() function
  - Use simple OR logic in single policies where possible
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "allow_own_select" ON users;
DROP POLICY IF EXISTS "allow_admin_select_all" ON users;
DROP POLICY IF EXISTS "allow_own_insert" ON users;
DROP POLICY IF EXISTS "allow_own_update" ON users;
DROP POLICY IF EXISTS "allow_admin_update_all" ON users;
DROP POLICY IF EXISTS "allow_admin_delete" ON users;

-- Single SELECT policy with OR logic
CREATE POLICY "select_own_or_admin_all" ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR is_admin()
  );

-- INSERT policy
CREATE POLICY "insert_own_profile" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Single UPDATE policy with OR logic  
CREATE POLICY "update_own_or_admin_any" ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR is_admin()
  )
  WITH CHECK (
    id = auth.uid() OR is_admin()
  );

-- DELETE policy for admins only (can't delete self)
CREATE POLICY "admin_delete_others" ON users
  FOR DELETE
  TO authenticated
  USING (
    is_admin() AND id != auth.uid()
  );
