/*
  # Fix Activity Log Journey References

  1. Changes
    - Rename trip_id column to journey_id in itinerary_activity_log table
    - Update foreign key constraint to reference journeys table correctly
    - Drop old constraint if exists and create new one
    
  2. Security
    - No changes to RLS policies
    - Maintains existing data integrity
*/

-- Drop the old foreign key constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'itinerary_activity_log_trip_id_fkey' 
    AND table_name = 'itinerary_activity_log'
  ) THEN
    ALTER TABLE itinerary_activity_log DROP CONSTRAINT itinerary_activity_log_trip_id_fkey;
  END IF;
END $$;

-- Rename trip_id to journey_id
ALTER TABLE itinerary_activity_log 
RENAME COLUMN trip_id TO journey_id;

-- Add foreign key constraint to journeys table
ALTER TABLE itinerary_activity_log
ADD CONSTRAINT itinerary_activity_log_journey_id_fkey 
FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE;
