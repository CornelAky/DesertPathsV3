/*
  # Fix Journey Staff Deletion and User Creation Issues

  1. Changes
    - Simplify journey_staff delete policy to check permissions directly
    - Ensure master_staff table has proper columns for user linking
    - Fix potential permission issues with staff operations
  
  2. Security
    - Maintain proper RLS policies for all operations
    - Ensure admins and managers can delete staff
    - Allow journey creators and editors to delete staff
*/

-- Drop the existing delete policy and recreate it with clearer logic
DROP POLICY IF EXISTS "Users can delete staff if they have edit permission" ON journey_staff;

-- Recreate the delete policy with explicit checks
CREATE POLICY "Users can delete journey staff"
  ON journey_staff
  FOR DELETE
  TO authenticated
  USING (
    -- Admins and managers can delete any staff
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('admin', 'manager')
    OR
    -- Journey creators can delete staff
    EXISTS (
      SELECT 1 FROM journeys 
      WHERE journeys.id = journey_staff.journey_id 
      AND journeys.created_by = auth.uid()
    )
    OR
    -- Users with edit permission via shares can delete staff
    EXISTS (
      SELECT 1 FROM journey_shares 
      WHERE journey_shares.journey_id = journey_staff.journey_id 
      AND journey_shares.shared_with = auth.uid() 
      AND journey_shares.permission_level IN ('edit', 'admin')
    )
  );

-- Ensure master_staff has all necessary columns for user linking
DO $$
BEGIN
  -- Ensure category column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'master_staff' AND column_name = 'category'
  ) THEN
    ALTER TABLE master_staff ADD COLUMN category text NOT NULL DEFAULT 'guide';
  END IF;

  -- Ensure status column exists  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'master_staff' AND column_name = 'status'
  ) THEN
    ALTER TABLE master_staff ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;

  -- Ensure subcategory column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'master_staff' AND column_name = 'subcategory'
  ) THEN
    ALTER TABLE master_staff ADD COLUMN subcategory text;
  END IF;
END $$;

-- Ensure users table has is_staff_member column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_staff_member'
  ) THEN
    ALTER TABLE users ADD COLUMN is_staff_member boolean DEFAULT false;
  END IF;
END $$;

-- Add helpful comment
COMMENT ON POLICY "Users can delete journey staff" ON journey_staff IS 'Allows admins, managers, journey creators, and users with edit permissions to delete staff from journeys';
