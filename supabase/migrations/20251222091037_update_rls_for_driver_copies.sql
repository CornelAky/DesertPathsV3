/*
  # Update RLS Policies for Driver Copies

  ## Overview
  This migration updates the Row Level Security policies for the trips table to support
  driver copies that are only visible to the guide who created them.

  ## Changes
  
  1. Updated SELECT Policy
    - Admins can only see official trips (is_driver_copy = false OR NULL)
    - Guides can see:
      - Trips shared with them (via trip_shares)
      - Driver copies they created (is_driver_copy = true AND created_by = current user)
  
  2. New INSERT Policy for Guides
    - Guides can create driver copies
    - Must set created_by to their own user ID
    - Must set is_driver_copy = true
  
  3. New UPDATE Policy for Guides
    - Guides can only edit their own driver copies
    - Cannot edit official trips unless they have share permissions
  
  4. New DELETE Policy for Guides
    - Guides can delete their own driver copies
    - Cannot delete official trips
  
  ## Security
  - Driver copies are isolated to the creating guide
  - Admins cannot see driver copies in their trip lists
  - Original trips remain protected from guide edits (unless explicitly shared with edit permission)
*/

-- Drop and recreate the SELECT policy with driver copy filtering
DROP POLICY IF EXISTS "Admins and shared users can view trips" ON trips;
CREATE POLICY "Admins and shared users can view trips"
  ON trips FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all NON-driver-copy trips
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      AND (is_driver_copy = false OR is_driver_copy IS NULL)
    )
    -- OR users can see trips shared with them (via trip_shares)
    OR has_trip_access(id, auth.uid(), 'view')
    -- OR guides can see driver copies they created
    OR (
      is_driver_copy = true 
      AND created_by = auth.uid()
    )
  );

-- Add policy for guides to create driver copies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trips' 
    AND policyname = 'Guides can create driver copies'
  ) THEN
    CREATE POLICY "Guides can create driver copies"
      ON trips
      FOR INSERT
      TO authenticated
      WITH CHECK (
        -- Must be a driver copy
        is_driver_copy = true
        -- Must set created_by to current user
        AND created_by = auth.uid()
        -- User must be a guide
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'guide'
      );
  END IF;
END $$;

-- Add policy for guides to update their driver copies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trips' 
    AND policyname = 'Guides can update their driver copies'
  ) THEN
    CREATE POLICY "Guides can update their driver copies"
      ON trips
      FOR UPDATE
      TO authenticated
      USING (
        -- Must be their own driver copy
        is_driver_copy = true
        AND created_by = auth.uid()
      )
      WITH CHECK (
        -- Ensure they don't change ownership
        is_driver_copy = true
        AND created_by = auth.uid()
      );
  END IF;
END $$;

-- Add policy for guides to delete their driver copies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trips' 
    AND policyname = 'Guides can delete their driver copies'
  ) THEN
    CREATE POLICY "Guides can delete their driver copies"
      ON trips
      FOR DELETE
      TO authenticated
      USING (
        -- Must be their own driver copy
        is_driver_copy = true
        AND created_by = auth.uid()
      );
  END IF;
END $$;