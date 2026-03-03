/*
  # Fix log_itinerary_activity to use journey_id

  1. Changes
    - Update log_itinerary_activity function to use journey_id instead of trip_id
    - The itinerary_activity_log table uses journey_id column, not trip_id
    - This fixes the constraint violation when archiving journeys
    
  2. Notes
    - The function was referencing the old trip_id column name
    - All references need to be updated to journey_id
*/

-- Drop and recreate the function with correct column name
DROP FUNCTION IF EXISTS log_itinerary_activity() CASCADE;

CREATE OR REPLACE FUNCTION log_itinerary_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_email TEXT;
  v_journey_id UUID;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM users
  WHERE id = auth.uid();

  -- Get journey_id based on the entry
  IF TG_TABLE_NAME = 'itinerary_entries' THEN
    v_journey_id := COALESCE(NEW.journey_id, OLD.journey_id);
  END IF;

  -- Log the activity
  IF TG_OP = 'INSERT' THEN
    INSERT INTO itinerary_activity_log (journey_id, entry_id, user_id, action, user_email)
    VALUES (v_journey_id, NEW.id, auth.uid(), 'created', v_user_email);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO itinerary_activity_log (journey_id, entry_id, user_id, action, user_email)
    VALUES (v_journey_id, NEW.id, auth.uid(), 'updated', v_user_email);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO itinerary_activity_log (journey_id, entry_id, user_id, action, user_email)
    VALUES (v_journey_id, OLD.id, auth.uid(), 'deleted', v_user_email);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS log_itinerary_changes ON itinerary_entries;
CREATE TRIGGER log_itinerary_changes
  AFTER INSERT OR UPDATE OR DELETE ON itinerary_entries
  FOR EACH ROW
  EXECUTE FUNCTION log_itinerary_activity();
