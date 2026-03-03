/*
  # Add Admin Journey Select Policy

  1. Problem
    - Admins cannot see all journeys on the journey management page
    - Only policies for guides/approved users exist, no admin-specific policy
    - Previous migration accidentally removed or didn't include admin policy

  2. Solution
    - Add a permissive SELECT policy specifically for admins
    - Admins with role='admin' can view all journeys

  3. Security
    - Only users with role='admin' can see all journeys
    - Other users still restricted by existing policies
*/

-- Add admin policy to view all journeys
CREATE POLICY "Admins can view all journeys"
  ON journeys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
