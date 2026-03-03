/*
  # Rename journey_shares foreign key constraints
  
  1. Changes
    - Rename foreign key constraints from trip_shares_* to journey_shares_*
    - This ensures PostgREST can find the correct relationships
  
  2. Constraints Renamed
    - trip_shares_shared_by_fkey → journey_shares_shared_by_fkey
    - trip_shares_shared_with_fkey → journey_shares_shared_with_fkey
    - trip_shares_trip_id_fkey → journey_shares_journey_id_fkey
*/

-- Rename the foreign key constraints to match the new table name
ALTER TABLE journey_shares 
  DROP CONSTRAINT IF EXISTS trip_shares_shared_by_fkey,
  ADD CONSTRAINT journey_shares_shared_by_fkey 
    FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE journey_shares 
  DROP CONSTRAINT IF EXISTS trip_shares_shared_with_fkey,
  ADD CONSTRAINT journey_shares_shared_with_fkey 
    FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE journey_shares 
  DROP CONSTRAINT IF EXISTS trip_shares_trip_id_fkey,
  ADD CONSTRAINT journey_shares_journey_id_fkey 
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE;
