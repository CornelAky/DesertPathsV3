/*
  # Remove Uniform and Badge Fields from Staff Table
  
  1. Changes
    - Drop uniform_issued column from trip_staff table
    - Drop badge_granted column from trip_staff table
  
  2. Reason
    - These fields are not needed for the staff management workflow
    - Simplifying the staff data model
  
  3. Notes
    - These columns are removed permanently
    - Only ID verification and contract signing are retained as requirements
*/

-- Drop uniform_issued column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_staff' AND column_name = 'uniform_issued'
  ) THEN
    ALTER TABLE trip_staff DROP COLUMN uniform_issued;
  END IF;
END $$;

-- Drop badge_granted column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_staff' AND column_name = 'badge_granted'
  ) THEN
    ALTER TABLE trip_staff DROP COLUMN badge_granted;
  END IF;
END $$;