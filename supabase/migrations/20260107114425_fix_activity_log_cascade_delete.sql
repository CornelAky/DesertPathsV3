/*
  # Fix Activity Log Cascade Delete

  1. Changes
    - Update foreign key constraint on itinerary_activity_log.entry_id
    - Set ON DELETE CASCADE so activity logs are automatically deleted when entries are deleted
    - This prevents the trigger from creating orphaned foreign key references

  2. Why This Fix
    - When deleting itinerary entries, a trigger logs the deletion to itinerary_activity_log
    - The trigger tries to insert a record with the deleted entry_id
    - With CASCADE, any existing logs are deleted first, and the trigger can insert the delete log
    - Then when the entry is actually deleted, the new log is also cascaded
*/

-- Drop the existing foreign key constraint
ALTER TABLE itinerary_activity_log
  DROP CONSTRAINT IF EXISTS itinerary_activity_log_entry_id_fkey;

-- Recreate it with ON DELETE CASCADE
ALTER TABLE itinerary_activity_log
  ADD CONSTRAINT itinerary_activity_log_entry_id_fkey
  FOREIGN KEY (entry_id)
  REFERENCES itinerary_entries(id)
  ON DELETE CASCADE;
