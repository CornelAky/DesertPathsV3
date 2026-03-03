/*
  # Fix Log Itinerary Activity Trigger for Deletions

  1. Changes
    - Update log_itinerary_activity function to set entry_id to NULL when logging deletions
    - This prevents foreign key constraint violations when entries are deleted
    - The trigger was trying to log a deletion with a reference to an entry that's being deleted

  2. Why This Fix
    - When deleting an entry, the trigger fires and tries to INSERT into itinerary_activity_log
    - The INSERT was using OLD.id as entry_id, but that entry is being deleted
    - Foreign key constraint fails because we can't reference a row that's being deleted
    - Solution: Set entry_id to NULL for deletion logs (column is already nullable)
*/

CREATE OR REPLACE FUNCTION log_itinerary_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_journey_id UUID;
  v_entry_id UUID;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM users
  WHERE id = auth.uid();

  -- Get journey_id based on the entry
  IF TG_TABLE_NAME = 'itinerary_entries' THEN
    v_journey_id := COALESCE(NEW.journey_id, OLD.journey_id);
  END IF;

  -- For deletions, don't store entry_id to avoid foreign key constraint violation
  IF TG_OP = 'DELETE' THEN
    v_entry_id := NULL;
  ELSE
    v_entry_id := NEW.id;
  END IF;

  -- Log the activity
  IF TG_OP = 'INSERT' THEN
    INSERT INTO itinerary_activity_log (journey_id, entry_id, user_id, action, user_email)
    VALUES (v_journey_id, v_entry_id, auth.uid(), 'created', v_user_email);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO itinerary_activity_log (journey_id, entry_id, user_id, action, user_email)
    VALUES (v_journey_id, v_entry_id, auth.uid(), 'updated', v_user_email);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO itinerary_activity_log (journey_id, entry_id, user_id, action, user_email)
    VALUES (v_journey_id, v_entry_id, auth.uid(), 'deleted', v_user_email);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;