/*
  # Update Guide RLS Policies for Trip Shares

  ## Overview
  Updates RLS policies for itinerary_days, accommodations, activities, and dining
  to allow access through trip_shares in addition to trip_assignments.

  ## Changes
  - Update itinerary_days SELECT policy to check trip_shares
  - Update accommodations SELECT policy to check trip_shares
  - Update activities SELECT and UPDATE policies to check trip_shares
  - Update dining SELECT policy to check trip_shares

  ## Security
  - Uses existing has_trip_access function for secure access control
  - Maintains backward compatibility with trip_assignments
  - Preserves admin access
*/

-- Update itinerary_days policy for shared access
DROP POLICY IF EXISTS "Guides can view assigned itinerary days" ON itinerary_days;
CREATE POLICY "Users can view accessible itinerary days"
  ON itinerary_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = itinerary_days.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
    OR has_trip_access(trip_id, auth.uid(), 'view')
  );

-- Update accommodations policy for shared access
DROP POLICY IF EXISTS "Guides can view assigned accommodations" ON accommodations;
CREATE POLICY "Users can view accessible accommodations"
  ON accommodations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = accommodations.day_id
      AND trip_assignments.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = accommodations.day_id
      AND has_trip_access(itinerary_days.trip_id, auth.uid(), 'view')
    )
  );

-- Update activities SELECT policy for shared access
DROP POLICY IF EXISTS "Guides can view assigned activities" ON activities;
CREATE POLICY "Users can view accessible activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = activities.day_id
      AND trip_assignments.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = activities.day_id
      AND has_trip_access(itinerary_days.trip_id, auth.uid(), 'view')
    )
  );

-- Update activities UPDATE policy for shared access
DROP POLICY IF EXISTS "Guides can update activity completion" ON activities;
CREATE POLICY "Users can update accessible activity completion"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = activities.day_id
      AND trip_assignments.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = activities.day_id
      AND has_trip_access(itinerary_days.trip_id, auth.uid(), 'view')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = activities.day_id
      AND trip_assignments.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = activities.day_id
      AND has_trip_access(itinerary_days.trip_id, auth.uid(), 'view')
    )
  );

-- Update dining policy for shared access
DROP POLICY IF EXISTS "Guides can view assigned dining" ON dining;
CREATE POLICY "Users can view accessible dining"
  ON dining FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = dining.day_id
      AND trip_assignments.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = dining.day_id
      AND has_trip_access(itinerary_days.trip_id, auth.uid(), 'view')
    )
  );
