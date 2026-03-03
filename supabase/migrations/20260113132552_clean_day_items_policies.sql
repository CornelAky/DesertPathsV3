/*
  # Clean Day Items RLS Policies

  1. Problem
    - Activities, accommodations, dining, transportation have complex policies
    - Not consistently using helper functions
    - May have performance issues

  2. Solution
    - Use can_view_journey and can_edit_journey consistently
    - Simplify all policies across day items
    - Ensure guides can see items for journeys shared with them

  3. Changes
    - Clean up policies for activities, accommodations, dining, transportation
    - Use helper functions exclusively
*/

-- ============================================
-- ACTIVITIES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view activities" ON activities;
DROP POLICY IF EXISTS "Authenticated users can manage activities" ON activities;
DROP POLICY IF EXISTS "Users with edit permission can insert activities" ON activities;
DROP POLICY IF EXISTS "Users with edit permission can update activities" ON activities;
DROP POLICY IF EXISTS "Users with edit permission can delete activities" ON activities;
DROP POLICY IF EXISTS "Guides can delete activities from their guide copies" ON activities;

CREATE POLICY "Users can view accessible activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    can_view_journey((SELECT journey_id FROM itinerary_days WHERE id = activities.day_id))
  );

CREATE POLICY "Users can manage activities in editable journeys"
  ON activities FOR ALL
  TO authenticated
  USING (
    can_edit_journey((SELECT journey_id FROM itinerary_days WHERE id = activities.day_id))
  )
  WITH CHECK (
    can_edit_journey((SELECT journey_id FROM itinerary_days WHERE id = activities.day_id))
  );

-- ============================================
-- ACCOMMODATIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view accommodations" ON accommodations;
DROP POLICY IF EXISTS "Users with edit permission can insert accommodations" ON accommodations;
DROP POLICY IF EXISTS "Users with edit permission can update accommodations" ON accommodations;
DROP POLICY IF EXISTS "Users with edit permission can delete accommodations" ON accommodations;
DROP POLICY IF EXISTS "Guides can delete accommodations from their guide copies" ON accommodations;

CREATE POLICY "Users can view accessible accommodations"
  ON accommodations FOR SELECT
  TO authenticated
  USING (
    can_view_journey((SELECT journey_id FROM itinerary_days WHERE id = accommodations.day_id))
  );

CREATE POLICY "Users can manage accommodations in editable journeys"
  ON accommodations FOR ALL
  TO authenticated
  USING (
    can_edit_journey((SELECT journey_id FROM itinerary_days WHERE id = accommodations.day_id))
  )
  WITH CHECK (
    can_edit_journey((SELECT journey_id FROM itinerary_days WHERE id = accommodations.day_id))
  );

-- ============================================
-- DINING TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view dining" ON dining;
DROP POLICY IF EXISTS "Guides can update dining completion" ON dining;
DROP POLICY IF EXISTS "Users with edit permission can insert dining" ON dining;
DROP POLICY IF EXISTS "Users with edit permission can update dining" ON dining;
DROP POLICY IF EXISTS "Users with edit permission can delete dining" ON dining;
DROP POLICY IF EXISTS "Guides can delete dining from their guide copies" ON dining;

CREATE POLICY "Users can view accessible dining"
  ON dining FOR SELECT
  TO authenticated
  USING (
    can_view_journey((SELECT journey_id FROM itinerary_days WHERE id = dining.day_id))
  );

CREATE POLICY "Users can manage dining in editable journeys"
  ON dining FOR ALL
  TO authenticated
  USING (
    can_edit_journey((SELECT journey_id FROM itinerary_days WHERE id = dining.day_id))
  )
  WITH CHECK (
    can_edit_journey((SELECT journey_id FROM itinerary_days WHERE id = dining.day_id))
  );

-- ============================================
-- TRANSPORTATION TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view transportation" ON transportation;
DROP POLICY IF EXISTS "Admins can insert transportation" ON transportation;
DROP POLICY IF EXISTS "Admins can update all transportation" ON transportation;
DROP POLICY IF EXISTS "Admins can delete transportation" ON transportation;
DROP POLICY IF EXISTS "Editors can manage transportation" ON transportation;
DROP POLICY IF EXISTS "Driver copy owners can add transportation" ON transportation;
DROP POLICY IF EXISTS "Driver copy owners can update their transportation" ON transportation;
DROP POLICY IF EXISTS "Driver copy owners can delete their transportation" ON transportation;
DROP POLICY IF EXISTS "Guides can insert transportation for their driver copies" ON transportation;
DROP POLICY IF EXISTS "Guides can update transportation for their driver copies" ON transportation;
DROP POLICY IF EXISTS "Guides can delete transportation for their driver copies" ON transportation;

CREATE POLICY "Users can view accessible transportation"
  ON transportation FOR SELECT
  TO authenticated
  USING (
    can_view_journey((SELECT journey_id FROM itinerary_days WHERE id = transportation.day_id))
  );

CREATE POLICY "Users can manage transportation in editable journeys"
  ON transportation FOR ALL
  TO authenticated
  USING (
    can_edit_journey((SELECT journey_id FROM itinerary_days WHERE id = transportation.day_id))
  )
  WITH CHECK (
    can_edit_journey((SELECT journey_id FROM itinerary_days WHERE id = transportation.day_id))
  );