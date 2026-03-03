/*
  # Fix Transportation Table References

  ## Changes
    - Drop and recreate the "Guides can view transportation for shared trips" policy
    - Update references from old table names (trip_shares, trips) to new names (journey_shares, journeys)
    - Ensures transportation features work correctly after table renaming

  ## Security
    - Maintains existing RLS security model
    - No changes to permission logic, only table name updates
*/

-- Drop the policy with old table references
DROP POLICY IF EXISTS "Guides can view transportation for shared trips" ON transportation;

-- Recreate with correct table names
CREATE POLICY "Guides can view transportation for shared trips"
  ON transportation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN journeys j ON j.id = d.journey_id
      JOIN journey_shares js ON js.journey_id = j.id
      WHERE d.id = transportation.day_id
      AND js.shared_with = auth.uid()
      AND js.is_active = true
      AND js.revoked_at IS NULL
    )
  );