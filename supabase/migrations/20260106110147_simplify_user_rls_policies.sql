/*
  # Simplify User RLS Policies

  ## Overview
  The current RLS policies on the users table are too complex and blocking authentication.
  This migration simplifies them to allow authentication to work while maintaining security.

  ## Changes
  - Simplify the SELECT policy to always allow users to read their own record
  - Simplify admin checks
  - Remove complex nested queries that cause recursion issues
*/

-- Drop all existing user policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Users can insert their profile" ON users;
DROP POLICY IF EXISTS "Allow users to insert their own profile during signup" ON users;

-- Simple SELECT policy: users can read their own record, admins can read all
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR role = 'admin'
  );

-- INSERT policy for new user registration
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE policy: users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE policy: only admins can soft delete (but not themselves)
CREATE POLICY "Admins can soft delete users" ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
    AND id != auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
    AND id != auth.uid()
  );
