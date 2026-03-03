/*
  # Add Trip Creator Tracking and Guide Edit Permissions

  1. Changes
    - Add created_by column to trips table to track who created each trip
    - Backfill existing trips with NULL (admins don't need tracking)
    - Add INSERT policy for authenticated users to create trips
    - Add UPDATE policy for users to edit trips they created
    - Add SELECT policy for users to view trips they created
    - Maintain existing admin and guide assignment policies

  2. Security
    - Users can only edit trips where created_by = their user_id
    - Original trip assignment system remains unchanged
    - Admin permissions remain unrestricted
    - Guides can create editable copies and manage them
*/

-- Add created_by column to trips table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE trips ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_trips_created_by ON trips(created_by);
  END IF;
END $$;

-- Drop existing guide view policy to recreate it
DROP POLICY IF EXISTS "Guides can view assigned trips" ON trips;

-- Allow users to view trips they're assigned to OR trips they created
CREATE POLICY "Users can view assigned or created trips"
  ON trips FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR
    -- Users can see trips assigned to them
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = trips.id
      AND trip_assignments.user_id = auth.uid()
    )
    OR
    -- Users can see trips they created
    trips.created_by = auth.uid()
    OR
    -- Users can see trips shared with them
    has_trip_access(id, auth.uid(), 'view')
  );

-- Allow authenticated users to create trips
CREATE POLICY "Authenticated users can create trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Allow users to update trips they created
CREATE POLICY "Users can update their own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_edit_permission(id)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_edit_permission(id)
  );

-- Allow users to delete trips they created
CREATE POLICY "Users can delete their own trips"
  ON trips FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );