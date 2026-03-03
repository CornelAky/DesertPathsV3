/*
  # Fix log_trip_updates action value

  1. Changes
    - Update log_trip_updates function to use 'updated' instead of 'update'
    - This matches the check constraint on itinerary_activity_log table
    - Prevents constraint violations when archiving journeys
    
  2. Notes
    - The check constraint allows: created, updated, deleted, shared, revoked, viewed, accessed
*/

-- Drop and recreate the function with correct action value
DROP FUNCTION IF EXISTS log_trip_updates() CASCADE;

CREATE OR REPLACE FUNCTION log_trip_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Try to fetch user email
    SELECT email INTO v_user_email
    FROM users
    WHERE id = auth.uid();
    
    INSERT INTO itinerary_activity_log (
      journey_id,
      user_id,
      action,
      field_name,
      user_email,
      metadata,
      timestamp
    ) VALUES (
      NEW.id,
      auth.uid(),
      'updated',
      'journey',
      v_user_email,
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
