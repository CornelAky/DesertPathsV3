/*
  # Add Day-Specific Trip Sharing

  ## Overview
  Enhances trip sharing to allow selecting specific days to share with guides.

  ## Changes

  ### 1. New Table: trip_share_days
  Tracks which specific days are shared for each trip share:
  - `id` (uuid, primary key)
  - `trip_share_id` (uuid, foreign key to trip_shares)
  - `day_id` (uuid, foreign key to itinerary_days)
  - `created_at` (timestamptz)
  
  ### 2. Modified trip_shares table
  - Added `share_all_days` (boolean) - if true, all days are shared (default)
  - If false, only days in trip_share_days are accessible

  ## Security
  - RLS enabled on trip_share_days table
  - Admins and share owners can manage shared days
  - Guides can only view their assigned days
  - Updated has_trip_access function to check day-level permissions

  ## Important Notes
  - When share_all_days = true, user has access to all days (backward compatible)
  - When share_all_days = false, only days in trip_share_days are accessible
  - Default is true to maintain backward compatibility
*/

-- Add share_all_days column to trip_shares
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_shares' AND column_name = 'share_all_days'
  ) THEN
    ALTER TABLE trip_shares ADD COLUMN share_all_days boolean DEFAULT true;
  END IF;
END $$;

-- Create trip_share_days table
CREATE TABLE IF NOT EXISTS trip_share_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_share_id uuid NOT NULL REFERENCES trip_shares(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(trip_share_id, day_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trip_share_days_share_id 
  ON trip_share_days(trip_share_id);

CREATE INDEX IF NOT EXISTS idx_trip_share_days_day_id 
  ON trip_share_days(day_id);

-- Enable RLS
ALTER TABLE trip_share_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_share_days

-- Admins and share owners can view shared days
CREATE POLICY "Admins and share participants can view trip share days"
  ON trip_share_days FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_shares.id = trip_share_days.trip_share_id
      AND (trip_shares.shared_by = auth.uid() OR trip_shares.shared_with = auth.uid())
    )
  );

-- Admins can create shared days
CREATE POLICY "Admins can create trip share days"
  ON trip_share_days FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Admins can delete shared days
CREATE POLICY "Admins can delete trip share days"
  ON trip_share_days FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Create helper function to check day-level access
CREATE OR REPLACE FUNCTION has_day_access(p_day_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_role text;
  v_trip_id uuid;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM users
  WHERE id = p_user_id;

  -- Admins have full access
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Get trip_id for the day
  SELECT trip_id INTO v_trip_id
  FROM itinerary_days
  WHERE id = p_day_id;

  -- Check if user has a trip share
  IF EXISTS (
    SELECT 1 FROM trip_shares
    WHERE trip_id = v_trip_id
    AND shared_with = p_user_id
    AND is_active = true
    AND revoked_at IS NULL
    AND (
      share_all_days = true
      OR EXISTS (
        SELECT 1 FROM trip_share_days
        WHERE trip_share_days.trip_share_id = trip_shares.id
        AND trip_share_days.day_id = p_day_id
      )
    )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Update itinerary_days RLS to respect day-level permissions
DROP POLICY IF EXISTS "Admins and shared users can view itinerary days" ON itinerary_days;
CREATE POLICY "Admins and shared users can view itinerary days"
  ON itinerary_days FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_day_access(id, auth.uid())
  );

-- Update accommodations RLS to respect day-level permissions
DROP POLICY IF EXISTS "Admins and shared users can view accommodations" ON accommodations;
CREATE POLICY "Admins and shared users can view accommodations"
  ON accommodations FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_day_access(day_id, auth.uid())
  );

-- Update activities RLS to respect day-level permissions
DROP POLICY IF EXISTS "Admins and shared users can view activities" ON activities;
CREATE POLICY "Admins and shared users can view activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_day_access(day_id, auth.uid())
  );

-- Update dining RLS to respect day-level permissions
DROP POLICY IF EXISTS "Admins and shared users can view dining" ON dining;
CREATE POLICY "Admins and shared users can view dining"
  ON dining FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_day_access(day_id, auth.uid())
  );
