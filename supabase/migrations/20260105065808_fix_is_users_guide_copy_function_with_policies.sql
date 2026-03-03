/*
  # Fix is_users_guide_copy Function with Policy Recreation

  1. Updates
    - Drop is_users_guide_copy function and dependent policies
    - Recreate function to use journeys table instead of trips
    - Recreate all dependent policies

  2. Security
    - No changes to security logic
    - Simply updates table reference from trips to journeys
    - Maintains all existing functionality and policies

  Important Notes:
    - This fixes the "relation trips does not exist" error during day duplication
    - All policies are recreated with the same logic
*/

-- Drop the function with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS is_users_guide_copy(uuid) CASCADE;

-- Recreate the function with correct table name
CREATE OR REPLACE FUNCTION is_users_guide_copy(trip_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM journeys
    WHERE journeys.id = trip_id_param
    AND journeys.created_by = auth.uid()
    AND journeys.is_driver_copy = true
  );
END;
$$;

-- Recreate dependent policies

-- Policy for itinerary_days insert
CREATE POLICY "Guides can insert days into their guide copies"
  ON itinerary_days
  FOR INSERT
  TO authenticated
  WITH CHECK (is_users_guide_copy(journey_id));

-- Policy for itinerary_days delete
CREATE POLICY "Guides can delete days from their guide copies"
  ON itinerary_days
  FOR DELETE
  TO authenticated
  USING (is_users_guide_copy(journey_id));

-- Policy for accommodations delete
CREATE POLICY "Guides can delete accommodations from their guide copies"
  ON accommodations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = accommodations.day_id
      AND is_users_guide_copy(d.journey_id)
    )
  );

-- Policy for activities delete
CREATE POLICY "Guides can delete activities from their guide copies"
  ON activities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = activities.day_id
      AND is_users_guide_copy(d.journey_id)
    )
  );

-- Policy for dining delete
CREATE POLICY "Guides can delete dining from their guide copies"
  ON dining
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      WHERE d.id = dining.day_id
      AND is_users_guide_copy(d.journey_id)
    )
  );
