/*
  # Fix Trash Delete - Allow Cascade Deletes for Archived Journeys

  1. Changes
    - Update delete policies for all journey-related tables
    - Allow admins and creators to delete records from archived journeys
    - Ensure proper cascade deletion when permanently deleting from trash

  2. Security
    - Maintain same security model (admins and creators only)
    - Apply to all journey child tables
*/

-- Update journey_staff delete policy
DROP POLICY IF EXISTS "Users can delete trip staff" ON journey_staff;
DROP POLICY IF EXISTS "Admins and creators can delete journey staff" ON journey_staff;
CREATE POLICY "Admins and creators can delete journey staff"
  ON journey_staff
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_staff.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update journey_vehicles delete policy
DROP POLICY IF EXISTS "Users can delete trip vehicles" ON journey_vehicles;
DROP POLICY IF EXISTS "Admins and creators can delete journey vehicles" ON journey_vehicles;
CREATE POLICY "Admins and creators can delete journey vehicles"
  ON journey_vehicles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_vehicles.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update journey_gear delete policy
DROP POLICY IF EXISTS "Users can delete trip gear" ON journey_gear;
DROP POLICY IF EXISTS "Admins and creators can delete journey gear" ON journey_gear;
CREATE POLICY "Admins and creators can delete journey gear"
  ON journey_gear
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_gear.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update journey_transportation_providers delete policy
DROP POLICY IF EXISTS "Users can delete trip transportation providers" ON journey_transportation_providers;
DROP POLICY IF EXISTS "Admins and creators can delete providers" ON journey_transportation_providers;
CREATE POLICY "Admins and creators can delete providers"
  ON journey_transportation_providers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_transportation_providers.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update journey_documents delete policy
DROP POLICY IF EXISTS "Users can delete journey documents" ON journey_documents;
DROP POLICY IF EXISTS "Admins and creators can delete journey documents" ON journey_documents;
CREATE POLICY "Admins and creators can delete journey documents"
  ON journey_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_documents.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update uploaded_documents delete policy
DROP POLICY IF EXISTS "Users can delete uploaded documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Admins and creators can delete documents" ON uploaded_documents;
CREATE POLICY "Admins and creators can delete documents"
  ON uploaded_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = uploaded_documents.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update uploaded_files delete policy
DROP POLICY IF EXISTS "Users can delete uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Admins and creators can delete files" ON uploaded_files;
CREATE POLICY "Admins and creators can delete files"
  ON uploaded_files
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = uploaded_files.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update properties delete policy
DROP POLICY IF EXISTS "Users can delete properties" ON properties;
DROP POLICY IF EXISTS "Admins and creators can delete properties" ON properties;
CREATE POLICY "Admins and creators can delete properties"
  ON properties
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = properties.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update journey_vehicle_day_assignments delete policy
DROP POLICY IF EXISTS "Users can delete vehicle day assignments" ON journey_vehicle_day_assignments;
DROP POLICY IF EXISTS "Admins and creators can delete assignments" ON journey_vehicle_day_assignments;
CREATE POLICY "Admins and creators can delete assignments"
  ON journey_vehicle_day_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN journeys j ON j.id = d.journey_id
      WHERE d.id = journey_vehicle_day_assignments.day_id
      AND (
        j.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update journey_assignments delete policy
DROP POLICY IF EXISTS "Users can delete journey assignments" ON journey_assignments;
DROP POLICY IF EXISTS "Admins and creators can delete journey assignments" ON journey_assignments;
CREATE POLICY "Admins and creators can delete journey assignments"
  ON journey_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_assignments.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update journey_share_links delete policy
DROP POLICY IF EXISTS "Users can delete journey share links" ON journey_share_links;
DROP POLICY IF EXISTS "Admins and creators can delete share links" ON journey_share_links;
CREATE POLICY "Admins and creators can delete share links"
  ON journey_share_links
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_share_links.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update shared_links delete policy
DROP POLICY IF EXISTS "Users can delete shared links" ON shared_links;
DROP POLICY IF EXISTS "Admins and creators can delete links" ON shared_links;
CREATE POLICY "Admins and creators can delete links"
  ON shared_links
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = shared_links.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );

-- Update extracted_itinerary_data delete policy
DROP POLICY IF EXISTS "Users can delete extracted data" ON extracted_itinerary_data;
DROP POLICY IF EXISTS "Admins and creators can delete extracted data" ON extracted_itinerary_data;
CREATE POLICY "Admins and creators can delete extracted data"
  ON extracted_itinerary_data
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = extracted_itinerary_data.journey_id
      AND (
        journeys.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
          AND users.status = 'active'
        )
      )
    )
  );
