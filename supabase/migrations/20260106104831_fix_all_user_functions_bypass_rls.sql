/*
  # Fix All User-Related Functions to Bypass RLS
  
  ## Problem
  Multiple functions query the users table without bypassing RLS:
  - has_any_admin()
  - is_first_user()
  - is_last_admin()
  - set_first_user_as_admin()
  
  When these functions are called within RLS policies, they trigger RLS checks
  which can call other functions that query users, leading to infinite recursion.
  
  ## Solution
  Add `SET row_security = off` to all functions that query the users table.
  This ensures they bypass RLS and prevent recursion.
  
  ## Changes
  - Update has_any_admin() with SET row_security = off
  - Update is_first_user() with SET row_security = off
  - Update is_last_admin() with SET row_security = off
  - Update set_first_user_as_admin() with SET row_security = off
*/

-- Update has_any_admin to bypass RLS
CREATE OR REPLACE FUNCTION has_any_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE role = 'admin'
  );
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off;

-- Update is_first_user to bypass RLS
CREATE OR REPLACE FUNCTION is_first_user()
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM users LIMIT 1
  );
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off;

-- Update is_last_admin to bypass RLS
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
SET search_path = public, pg_temp
SET row_security = off;

-- Update set_first_user_as_admin trigger function to bypass RLS
CREATE OR REPLACE FUNCTION set_first_user_as_admin()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
    NEW.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off;