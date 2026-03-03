/*
  # Fix Edit Permission Function

  1. Problem
    - The has_edit_permission function only checks trip_shares table
    - Admins and trip owners cannot edit their own trips
    - This causes "Failed to save accommodation" errors

  2. Solution
    - Update has_edit_permission to return true for:
      - Admins (users with role = 'admin')
      - Users with shared edit permission
    
  3. Changes
    - Replace has_edit_permission function with improved logic
    - Admins can edit all trips
    - Users with shared edit permission can edit shared trips
*/

CREATE OR REPLACE FUNCTION has_edit_permission(trip_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_shares.trip_id = trip_id_param
      AND trip_shares.shared_with = auth.uid()
      AND trip_shares.permission_level = 'edit'
      AND trip_shares.is_active = true
      AND (trip_shares.revoked_at IS NULL OR trip_shares.revoked_at > now())
    )
  );
END;
$$;
