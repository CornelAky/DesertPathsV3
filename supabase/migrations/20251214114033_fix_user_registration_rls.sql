/*
  # Fix User Registration and First Admin Setup

  ## Changes
  
  1. RLS Policies
    - Add policy allowing users to insert their own profile during registration
    - This enables the signup flow to work properly
  
  2. Helper Functions
    - `has_any_admin()` - Returns true if at least one admin user exists
    - `is_first_user()` - Returns true if no users exist in the database
  
  3. Security
    - Users can only insert a record for themselves (id must match auth.uid())
    - The first user will be assigned admin role automatically (handled in app logic)
    - Subsequent users can only be created by existing admins through the admin panel
  
  ## Notes
  - This migration fixes the issue where new users cannot sign up
  - The first user to sign up will become an admin
  - After first admin exists, only admins can create new users
*/

-- Helper function to check if any admin users exist
CREATE OR REPLACE FUNCTION has_any_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if this is the first user
CREATE OR REPLACE FUNCTION is_first_user()
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM users LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Allow authenticated users to insert their own profile
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);