/*
  # Allow Unrestricted Duplication

  ## Summary
  Remove restrictions on duplicating days by allowing all authenticated users
  to insert and manage accommodations, activities, dining, and itinerary entries.

  ## Changes

  ### 1. Update Policies
    - Add permissive policies for authenticated users to manage all tables
    - Keep existing admin and edit permission policies for backwards compatibility

  ## Notes
  - All authenticated users can now duplicate days without restrictions
  - Existing admin and permission-based policies remain active
*/

-- Allow all authenticated users to manage itinerary_days
CREATE POLICY "Authenticated users can manage itinerary days"
  ON itinerary_days FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to manage accommodations
CREATE POLICY "Authenticated users can manage accommodations"
  ON accommodations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to manage activities
CREATE POLICY "Authenticated users can manage activities"
  ON activities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to manage dining
CREATE POLICY "Authenticated users can manage dining"
  ON dining FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to manage itinerary entries
CREATE POLICY "Authenticated users can manage itinerary entries"
  ON itinerary_entries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to manage activity booking fees
CREATE POLICY "Authenticated users can manage activity booking fees"
  ON activity_booking_fees FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);