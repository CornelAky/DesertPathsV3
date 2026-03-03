/*
  # Add INSERT and UPDATE Policies for Itinerary Days

  1. New Policies
    - Add INSERT policy for itinerary_days for users with edit permission
    - Add UPDATE policy for itinerary_days for users with edit permission
    - Allows day duplication and editing to work properly

  2. Security
    - Uses has_edit_permission function to check permissions
    - Maintains existing guide-specific policies
    - No changes to existing data

  Important Notes:
    - This fixes the "violates row-level security policy" error when duplicating days
    - Works alongside the existing guide-specific policies
*/

-- Insert policy for itinerary_days
CREATE POLICY "Users with edit permission can insert days"
  ON itinerary_days
  FOR INSERT
  TO authenticated
  WITH CHECK (has_edit_permission(journey_id));

-- Update policy for itinerary_days
CREATE POLICY "Users with edit permission can update days"
  ON itinerary_days
  FOR UPDATE
  TO authenticated
  USING (has_edit_permission(journey_id))
  WITH CHECK (has_edit_permission(journey_id));

-- Delete policy for itinerary_days
CREATE POLICY "Users with edit permission can delete days"
  ON itinerary_days
  FOR DELETE
  TO authenticated
  USING (has_edit_permission(journey_id));
