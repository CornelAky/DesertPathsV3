/*
  # Fix log_trip_updates Function

  1. Changes
    - Drop and recreate log_trip_updates function to match actual table structure
    - Uses existing columns: journey_id, user_id, action, field_name, old_value, new_value, metadata
    - Removes references to non-existent columns entity_type, entity_id, changes
    
  2. Notes
    - Function now correctly logs journey updates to itinerary_activity_log
    - Uses metadata jsonb column for storing change details
*/

-- Drop the old function
DROP FUNCTION IF EXISTS log_trip_updates() CASCADE;

-- Recreate with correct column references
CREATE OR REPLACE FUNCTION log_trip_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO itinerary_activity_log (
      journey_id,
      user_id,
      action,
      field_name,
      metadata,
      timestamp
    ) VALUES (
      NEW.id,
      auth.uid(),
      'update',
      'journey',
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      ),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trip_updates_trigger ON journeys;
CREATE TRIGGER trip_updates_trigger
  AFTER UPDATE ON journeys
  FOR EACH ROW
  EXECUTE FUNCTION log_trip_updates();
