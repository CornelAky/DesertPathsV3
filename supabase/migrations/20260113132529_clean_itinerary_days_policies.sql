/*
  # Clean Itinerary Days RLS Policies

  1. Problem
    - Complex SELECT policy with direct user table queries
    - Could cause performance issues and inconsistency
    - Not using helper functions consistently

  2. Solution
    - Simplify policies to use helper functions
    - Use can_view_journey for SELECT
    - Use can_edit_journey for INSERT, UPDATE, DELETE
    - Ensure all checks go through SECURITY DEFINER functions

  3. Changes
    - Drop redundant policies
    - Create clean policies using helper functions
*/

-- Drop all existing itinerary_days policies
DROP POLICY IF EXISTS "Users can view itinerary days" ON itinerary_days;
DROP POLICY IF EXISTS "Users with edit permission can insert days" ON itinerary_days;
DROP POLICY IF EXISTS "Guides can insert days into their guide copies" ON itinerary_days;
DROP POLICY IF EXISTS "Users with edit permission can update days" ON itinerary_days;
DROP POLICY IF EXISTS "Users with edit permission can delete days" ON itinerary_days;
DROP POLICY IF EXISTS "Guides can delete days from their guide copies" ON itinerary_days;

-- Create clean, simple policies

-- SELECT: Users can view days for journeys they have access to
CREATE POLICY "Users can view accessible itinerary days"
  ON itinerary_days FOR SELECT
  TO authenticated
  USING (can_view_journey(journey_id));

-- INSERT: Users can add days to journeys they can edit
CREATE POLICY "Users can insert days to editable journeys"
  ON itinerary_days FOR INSERT
  TO authenticated
  WITH CHECK (can_edit_journey(journey_id));

-- UPDATE: Users can update days in journeys they can edit
CREATE POLICY "Users can update days in editable journeys"
  ON itinerary_days FOR UPDATE
  TO authenticated
  USING (can_edit_journey(journey_id))
  WITH CHECK (can_edit_journey(journey_id));

-- DELETE: Users can delete days from journeys they can edit
CREATE POLICY "Users can delete days from editable journeys"
  ON itinerary_days FOR DELETE
  TO authenticated
  USING (can_edit_journey(journey_id));