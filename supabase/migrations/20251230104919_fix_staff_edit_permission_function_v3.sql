/*
  # Fix has_staff_edit_permission function for journey tables
  
  1. Changes
    - Update has_staff_edit_permission function to use journey_shares instead of trip_shares
    - Update to use journeys instead of trips
    - Update to use journey_id instead of trip_id
    - Keep parameter name as target_trip_id to avoid breaking existing policies
    
  2. Reason
    - The function was still referencing old table names after the trips→journeys rename
    - This was causing RLS policies to fail, preventing staff creation and updates
*/

-- Replace function body with correct table names (keep parameter name to avoid breaking policies)
CREATE OR REPLACE FUNCTION has_staff_edit_permission(target_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM journey_shares 
      WHERE journey_id = target_trip_id 
      AND shared_with = auth.uid()
      AND permission_level IN ('edit', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM journeys
      WHERE id = target_trip_id
      AND created_by = auth.uid()
    )
  );
END;
$$;