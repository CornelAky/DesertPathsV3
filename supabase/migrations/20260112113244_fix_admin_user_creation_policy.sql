/*
  # Fix Admin User Creation - Add INSERT Policy
  
  1. Changes
    - Add policy to allow admins to insert new user records
    - This fixes the "new row violates row-level security policy" error
  
  2. Security
    - Only admins can create new users
    - Users can still insert their own profile on first login
*/

-- Drop existing restrictive insert policy if it's preventing admin inserts
DROP POLICY IF EXISTS "allow_own_insert" ON users;

-- Recreate policy to allow own insert (for self-registration)
CREATE POLICY "allow_own_insert" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Add new policy to allow admins to create other users
CREATE POLICY "allow_admin_insert_all" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'manager')
      AND u.status IN ('approved', 'active')
      AND u.deleted_at IS NULL
      LIMIT 1
    )
  );
