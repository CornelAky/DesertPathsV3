/*
  # Fix RLS Functions to Use Correct Journey Table References

  ## Changes
  1. Drop problematic functions with CASCADE
  2. Recreate has_edit_permission with correct logic
  3. Fix has_day_access to use journey_id and journey_shares
  4. Fix has_journey_access to use journey_id and journey_shares
  5. Recreate dependent RLS policies with correct column references

  ## Notes
  - Functions were referencing old "trip" table names
  - Tables use day_id (not journey_id) for activities/accommodations/dining/transportation
  - journey_gear uses journey_id directly
*/

-- Drop all problematic functions with CASCADE
DROP FUNCTION IF EXISTS has_edit_permission(uuid) CASCADE;
DROP FUNCTION IF EXISTS has_edit_permission(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS has_day_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS has_journey_access(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS has_journey_access(uuid, uuid) CASCADE;

-- Recreate has_edit_permission with correct logic
CREATE OR REPLACE FUNCTION has_edit_permission(journey_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET row_security TO 'off'
AS $$
DECLARE
  user_role text;
  is_creator boolean;
  has_share boolean;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM journeys 
    WHERE id = journey_id 
    AND created_by = auth.uid()
  ) INTO is_creator;
  
  IF is_creator THEN
    RETURN true;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM journey_shares 
    WHERE journey_shares.journey_id = has_edit_permission.journey_id 
    AND shared_with = auth.uid() 
    AND permission IN ('edit', 'admin')
  ) INTO has_share;
  
  RETURN has_share;
END;
$$;

-- Fix has_day_access to use journey tables
CREATE OR REPLACE FUNCTION has_day_access(p_day_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_role text;
  v_journey_id uuid;
BEGIN
  SELECT role INTO v_user_role
  FROM users
  WHERE id = p_user_id;
  
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  SELECT journey_id INTO v_journey_id
  FROM itinerary_days
  WHERE id = p_day_id;
  
  IF EXISTS (
    SELECT 1 FROM journeys
    WHERE id = v_journey_id
    AND created_by = p_user_id
  ) THEN
    RETURN true;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM journey_shares
    WHERE journey_id = v_journey_id
    AND shared_with = p_user_id
    AND (
      share_all_days = true
      OR EXISTS (
        SELECT 1 FROM journey_share_days
        WHERE journey_share_days.journey_share_id = journey_shares.id
        AND journey_share_days.day_id = p_day_id
      )
    )
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Fix has_journey_access to use journey tables
CREATE OR REPLACE FUNCTION has_journey_access(p_journey_id uuid, p_user_id uuid, required_permission text DEFAULT 'view')
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_role text;
BEGIN
  SELECT role INTO v_user_role
  FROM users
  WHERE id = p_user_id;
  
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM journeys
    WHERE id = p_journey_id
    AND created_by = p_user_id
  ) THEN
    RETURN true;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM journey_shares
    WHERE journey_id = p_journey_id
    AND shared_with = p_user_id
    AND (
      required_permission = 'view'
      OR (required_permission = 'edit' AND permission IN ('edit', 'admin'))
    )
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Recreate journey_gear policies
CREATE POLICY "Users can add trip gear"
  ON journey_gear FOR INSERT
  TO authenticated
  WITH CHECK (has_edit_permission(journey_id));

CREATE POLICY "Users can update trip gear"
  ON journey_gear FOR UPDATE
  TO authenticated
  USING (has_edit_permission(journey_id))
  WITH CHECK (has_edit_permission(journey_id));

-- Recreate transportation policies (uses day_id)
CREATE POLICY "Editors can manage transportation"
  ON transportation FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = transportation.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = transportation.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  );

-- Recreate activities policies (uses day_id)
CREATE POLICY "Users with edit permission can delete activities"
  ON activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = activities.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  );

CREATE POLICY "Users with edit permission can insert activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = activities.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  );

CREATE POLICY "Users with edit permission can update activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = activities.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = activities.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  );

-- Recreate dining policies (uses day_id)
CREATE POLICY "Users with edit permission can delete dining"
  ON dining FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = dining.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  );

CREATE POLICY "Users with edit permission can insert dining"
  ON dining FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = dining.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  );

CREATE POLICY "Users with edit permission can update dining"
  ON dining FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = dining.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = dining.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  );

-- Recreate accommodations policies (uses day_id)
CREATE POLICY "Users with edit permission can delete accommodations"
  ON accommodations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = accommodations.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  );

CREATE POLICY "Users with edit permission can insert accommodations"
  ON accommodations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = accommodations.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  );

CREATE POLICY "Users with edit permission can update accommodations"
  ON accommodations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = accommodations.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = accommodations.day_id
      AND has_edit_permission(itinerary_days.journey_id)
    )
  );

-- Recreate itinerary_days policies
CREATE POLICY "Users with edit permission can insert days"
  ON itinerary_days FOR INSERT
  TO authenticated
  WITH CHECK (has_edit_permission(journey_id));

CREATE POLICY "Users with edit permission can update days"
  ON itinerary_days FOR UPDATE
  TO authenticated
  USING (has_edit_permission(journey_id))
  WITH CHECK (has_edit_permission(journey_id));

CREATE POLICY "Users with edit permission can delete days"
  ON itinerary_days FOR DELETE
  TO authenticated
  USING (has_edit_permission(journey_id));

-- Recreate policies that depend on has_day_access
CREATE POLICY "Admins and shared users can view itinerary days"
  ON itinerary_days FOR SELECT
  TO authenticated
  USING (
    (SELECT users.role FROM users WHERE users.id = auth.uid()) = 'admin'
    OR has_day_access(id, auth.uid())
  );
