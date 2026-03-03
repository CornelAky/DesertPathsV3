/*
  # Fix Itinerary Days SELECT Policy to Include Journey Creators

  ## Changes
  1. Drop existing SELECT policy
  2. Recreate with proper access control including journey creators

  ## Notes
  - Previous policy didn't check if user was the journey creator
  - This was preventing journey owners from seeing their own days
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Admins and shared users can view itinerary days" ON itinerary_days;
DROP POLICY IF EXISTS "Users can view accessible itinerary days" ON itinerary_days;

-- Create comprehensive SELECT policy
CREATE POLICY "Users can view itinerary days"
  ON itinerary_days FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all
    (SELECT users.role FROM users WHERE users.id = auth.uid()) = 'admin'
    OR
    -- Journey creators can see their days
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = itinerary_days.journey_id
      AND journeys.created_by = auth.uid()
    )
    OR
    -- Users with share access can see days
    has_day_access(id, auth.uid())
  );
