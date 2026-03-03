/*
  # Add SELECT policies for day items

  1. Changes
    - Add SELECT policies for accommodations, activities, dining, and transportation
    - These tables have RLS enabled but are missing SELECT policies
    - Policies check if user has access to the parent journey through the itinerary day
    
  2. Security
    - Users can view items if they can view the parent itinerary day
    - Admins can view all items
    - Journey creators can view their journey items
    - Users with shared access can view items for days they have access to
*/

-- Accommodations SELECT policy
CREATE POLICY "Users can view accommodations"
  ON accommodations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = accommodations.day_id
      AND (
        (SELECT users.role FROM users WHERE users.id = auth.uid()) = 'admin'
        OR EXISTS (
          SELECT 1 FROM journeys
          WHERE journeys.id = itinerary_days.journey_id
          AND journeys.created_by = auth.uid()
        )
        OR has_day_access(itinerary_days.id, auth.uid())
      )
    )
  );

-- Activities SELECT policy
CREATE POLICY "Users can view activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = activities.day_id
      AND (
        (SELECT users.role FROM users WHERE users.id = auth.uid()) = 'admin'
        OR EXISTS (
          SELECT 1 FROM journeys
          WHERE journeys.id = itinerary_days.journey_id
          AND journeys.created_by = auth.uid()
        )
        OR has_day_access(itinerary_days.id, auth.uid())
      )
    )
  );

-- Dining SELECT policy
CREATE POLICY "Users can view dining"
  ON dining FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = dining.day_id
      AND (
        (SELECT users.role FROM users WHERE users.id = auth.uid()) = 'admin'
        OR EXISTS (
          SELECT 1 FROM journeys
          WHERE journeys.id = itinerary_days.journey_id
          AND journeys.created_by = auth.uid()
        )
        OR has_day_access(itinerary_days.id, auth.uid())
      )
    )
  );

-- Transportation SELECT policy
CREATE POLICY "Users can view transportation"
  ON transportation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      WHERE itinerary_days.id = transportation.day_id
      AND (
        (SELECT users.role FROM users WHERE users.id = auth.uid()) = 'admin'
        OR EXISTS (
          SELECT 1 FROM journeys
          WHERE journeys.id = itinerary_days.journey_id
          AND journeys.created_by = auth.uid()
        )
        OR has_day_access(itinerary_days.id, auth.uid())
      )
    )
  );
