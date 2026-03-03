/*
  # Fix log_share_link_access to use journey_id

  1. Changes
    - Update log_share_link_access function to use journey_id instead of trip_id
    - The itinerary_activity_log table uses journey_id column, not trip_id
    - Also update references to trip_share_links table which is now journey_share_links
    
  2. Notes
    - The function was referencing old table and column names
    - All references need to be updated to journey_id
*/

-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS log_share_link_access(TEXT, UUID) CASCADE;

CREATE OR REPLACE FUNCTION log_share_link_access(p_token TEXT, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_link_id UUID;
  v_journey_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get link details (using journey_share_links table)
  SELECT id, journey_id INTO v_link_id, v_journey_id
  FROM journey_share_links
  WHERE share_token = p_token
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now());

  IF v_link_id IS NULL THEN
    RETURN;
  END IF;

  -- Update access count and timestamp
  UPDATE journey_share_links
  SET 
    access_count = access_count + 1,
    last_accessed_at = now()
  WHERE id = v_link_id;

  -- Get user email
  SELECT email INTO v_user_email
  FROM users
  WHERE id = p_user_id;

  -- Log the access (using journey_id)
  INSERT INTO itinerary_activity_log (journey_id, user_id, action, user_email, metadata)
  VALUES (
    v_journey_id,
    p_user_id,
    'accessed',
    v_user_email,
    jsonb_build_object('via', 'share_link', 'token_id', v_link_id)
  );
END;
$$;
