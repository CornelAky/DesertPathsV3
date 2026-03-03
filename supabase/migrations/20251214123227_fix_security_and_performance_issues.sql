/*
  # Fix Security and Performance Issues

  ## Overview
  This migration addresses critical security and performance issues identified in the database:
  - Adds missing foreign key index
  - Optimizes RLS policies for better performance
  - Fixes function search paths for security

  ## Changes

  ### 1. Missing Index
  - Add index on `shared_links.trip_id` to improve foreign key performance

  ### 2. RLS Policy Performance Optimization
  All RLS policies have been updated to use `(select auth.uid())` instead of `auth.uid()`
  directly. This prevents re-evaluation of auth functions for each row, significantly
  improving query performance at scale.

  Tables affected:
  - customers
  - trips
  - itinerary_days
  - accommodations
  - activities
  - dining
  - documents
  - users
  - trip_assignments
  - shared_links

  ### 3. Function Search Path Security
  Updated all functions to have immutable search paths by adding explicit
  `SET search_path = public, auth` to prevent search path manipulation attacks.

  Functions updated:
  - update_updated_at_column
  - is_first_user
  - has_any_admin
  - is_admin
  - set_first_user_as_admin

  ## Security Notes
  - All changes maintain existing security model
  - No data access patterns are modified
  - Only performance and security hardening improvements
*/

-- ============================================================================
-- 1. ADD MISSING INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shared_links_trip_id ON shared_links(trip_id);

-- ============================================================================
-- 2. OPTIMIZE RLS POLICIES - Replace auth.uid() with (select auth.uid())
-- ============================================================================

-- Drop all existing policies that need optimization
DROP POLICY IF EXISTS "Admins can manage all customers" ON customers;
DROP POLICY IF EXISTS "Admins can manage all trips" ON trips;
DROP POLICY IF EXISTS "Guides can view assigned trips" ON trips;
DROP POLICY IF EXISTS "Admins can manage all itinerary days" ON itinerary_days;
DROP POLICY IF EXISTS "Guides can view assigned itinerary days" ON itinerary_days;
DROP POLICY IF EXISTS "Admins can manage all accommodations" ON accommodations;
DROP POLICY IF EXISTS "Guides can view assigned accommodations" ON accommodations;
DROP POLICY IF EXISTS "Admins can manage all activities" ON activities;
DROP POLICY IF EXISTS "Guides can view assigned activities" ON activities;
DROP POLICY IF EXISTS "Guides can update activity completion" ON activities;
DROP POLICY IF EXISTS "Admins can manage all dining" ON dining;
DROP POLICY IF EXISTS "Guides can view assigned dining" ON dining;
DROP POLICY IF EXISTS "Guides can update dining completion" ON dining;
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;
DROP POLICY IF EXISTS "Guides can view assigned documents" ON documents;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all assignments" ON trip_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON trip_assignments;
DROP POLICY IF EXISTS "Admins can manage all shared links" ON shared_links;

-- Recreate optimized policies for customers
CREATE POLICY "Admins can manage all customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  );

-- Recreate optimized policies for trips
CREATE POLICY "Admins can manage all trips"
  ON trips FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Guides can view assigned trips"
  ON trips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = trips.id
      AND trip_assignments.user_id = (select auth.uid())
    )
  );

-- Recreate optimized policies for itinerary_days
CREATE POLICY "Admins can manage all itinerary days"
  ON itinerary_days FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Guides can view assigned itinerary days"
  ON itinerary_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = itinerary_days.trip_id
      AND trip_assignments.user_id = (select auth.uid())
    )
  );

-- Recreate optimized policies for accommodations
CREATE POLICY "Admins can manage all accommodations"
  ON accommodations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Guides can view assigned accommodations"
  ON accommodations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = accommodations.day_id
      AND trip_assignments.user_id = (select auth.uid())
    )
  );

-- Recreate optimized policies for activities
CREATE POLICY "Admins can manage all activities"
  ON activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Guides can view assigned activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = activities.day_id
      AND trip_assignments.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Guides can update activity completion"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = activities.day_id
      AND trip_assignments.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = activities.day_id
      AND trip_assignments.user_id = (select auth.uid())
    )
  );

-- Recreate optimized policies for dining
CREATE POLICY "Admins can manage all dining"
  ON dining FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Guides can view assigned dining"
  ON dining FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = dining.day_id
      AND trip_assignments.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Guides can update dining completion"
  ON dining FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = dining.day_id
      AND trip_assignments.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = dining.day_id
      AND trip_assignments.user_id = (select auth.uid())
    )
  );

-- Recreate optimized policies for documents
CREATE POLICY "Admins can manage all documents"
  ON documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Guides can view assigned documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE (
        (documents.related_type = 'accommodation' AND documents.related_id IN (
          SELECT id FROM accommodations WHERE day_id = itinerary_days.id
        ))
        OR (documents.related_type = 'activity' AND documents.related_id IN (
          SELECT id FROM activities WHERE day_id = itinerary_days.id
        ))
        OR (documents.related_type = 'dining' AND documents.related_id IN (
          SELECT id FROM dining WHERE day_id = itinerary_days.id
        ))
      )
      AND trip_assignments.user_id = (select auth.uid())
    )
  );

-- Recreate optimized policies for users
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Recreate optimized policies for trip_assignments
CREATE POLICY "Admins can manage all assignments"
  ON trip_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can view own assignments"
  ON trip_assignments FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Recreate optimized policies for shared_links
CREATE POLICY "Admins can manage all shared links"
  ON shared_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 3. FIX FUNCTION SEARCH PATHS
-- ============================================================================

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Update is_admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth, pg_temp;

-- Update has_any_admin function
CREATE OR REPLACE FUNCTION has_any_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE role = 'admin'
  );
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Update is_first_user function
CREATE OR REPLACE FUNCTION is_first_user()
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM users LIMIT 1
  );
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Update set_first_user_as_admin function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'set_first_user_as_admin'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION set_first_user_as_admin()
      RETURNS TRIGGER AS $func$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM users WHERE role = ''admin'') THEN
          NEW.role = ''admin'';
        END IF;
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql 
      SECURITY DEFINER
      SET search_path = public, pg_temp;
    ';
  END IF;
END $$;
