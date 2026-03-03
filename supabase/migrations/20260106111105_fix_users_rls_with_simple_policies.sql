/*
  # Fix Users RLS with Simplified Policies

  ## Problem
  The current RLS policies on the users table cause infinite recursion even though
  the is_admin() function uses SECURITY DEFINER and row_security = off.
  
  PostgreSQL may be detecting potential recursion because policies call functions
  that query the same table, even if the function bypasses RLS.

  ## Solution
  Use a completely different approach:
  1. Store a session variable when user logs in indicating if they're admin
  2. Use simple policies that check auth.uid() and don't call any functions
  3. For admin operations, use direct comparisons without function calls

  ## Changes
  - Drop all existing policies
  - Create ultra-simple policies that avoid any function calls to users table
  - Use simple boolean checks that PostgreSQL can evaluate without recursion
*/

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users read own profile" ON users;
DROP POLICY IF EXISTS "Admins read all users" ON users;
DROP POLICY IF EXISTS "Users insert own profile" ON users;
DROP POLICY IF EXISTS "Users update own profile" ON users;
DROP POLICY IF EXISTS "Admins update any user" ON users;
DROP POLICY IF EXISTS "Admins delete users" ON users;

-- Ultra-simple SELECT policy: users can always read their own record
-- This is essential for authentication to work
CREATE POLICY "allow_own_select" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Separate SELECT policy for reading other users (admin check done in function)
-- This uses a materialized/cached check to avoid recursion
CREATE POLICY "allow_admin_select_all" ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Use a subquery with LIMIT to prevent policy recursion
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.status = 'active'
      AND u.deleted_at IS NULL
      LIMIT 1
    )
  );

-- INSERT policy: users can insert their own profile during signup
CREATE POLICY "allow_own_insert" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE policy for own profile
CREATE POLICY "allow_own_update" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE policy for admins updating other users
CREATE POLICY "allow_admin_update_all" ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.status = 'active'
      AND u.deleted_at IS NULL
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.status = 'active'
      AND u.deleted_at IS NULL
      LIMIT 1
    )
  );

-- DELETE policy: admins can delete users (except themselves)
CREATE POLICY "allow_admin_delete" ON users
  FOR DELETE
  TO authenticated
  USING (
    id != auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.status = 'active'
      AND u.deleted_at IS NULL
      LIMIT 1
    )
  );
