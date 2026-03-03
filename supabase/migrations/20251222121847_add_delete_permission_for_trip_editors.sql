/*
  # Allow trip editors to delete trips

  1. Changes
    - Update DELETE policy on trips table to allow users with edit permission to delete trips
    - Maintains existing admin delete permission
    - Allows trip creators and users with edit shares to delete trips

  2. Security
    - Users can only delete trips if they:
      - Are admins, OR
      - Created the trip (via created_by), OR
      - Have edit permission via trip_shares
    - Maintains data integrity through existing CASCADE constraints
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Admins can delete trips" ON trips;

-- Create new policy that allows admins, creators, and users with edit permission to delete
CREATE POLICY "Users with edit permission can delete trips"
  ON trips
  FOR DELETE
  TO authenticated
  USING (
    is_admin() 
    OR created_by = auth.uid()
    OR has_edit_permission(id)
  );
