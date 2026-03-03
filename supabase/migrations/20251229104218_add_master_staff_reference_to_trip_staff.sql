/*
  # Add Master Staff Reference to Trip Staff
  
  1. Changes
    - Add master_staff_id column to trip_staff table
    - This creates a link between trip staff assignments and master staff records
    - Allows tracking which master staff member was used to create each trip staff entry
  
  2. Notes
    - Column is nullable because existing trip staff and manually created staff won't have this reference
    - Foreign key ensures referential integrity with master_staff table
    - When a master staff member is assigned to a trip, this field will be populated
*/

-- Add master_staff_id column to trip_staff
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_staff' AND column_name = 'master_staff_id'
  ) THEN
    ALTER TABLE trip_staff ADD COLUMN master_staff_id uuid REFERENCES master_staff(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_trip_staff_master_staff_id ON trip_staff(master_staff_id);