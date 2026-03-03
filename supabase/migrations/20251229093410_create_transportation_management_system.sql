/*
  # Create Transportation Management System
  
  1. New Tables
    - `trip_transportation_providers`
      - Transportation company/provider information
      - Contact details
    
    - `trip_vehicles`
      - Vehicle information (type, capacity, license plate)
      - Links to provider
      - Links to driver (from trip_staff)
      - Status tracking
    
    - `trip_vehicle_day_assignments`
      - Assigns vehicles to specific days
    
    - `trip_vehicle_activity_assignments`
      - Assigns vehicles to specific activities
  
  2. Enums
    - vehicle_type: Bus, Van, SUV, Sedan, etc.
    - vehicle_status: Confirmed, Pending, Cancelled, Maintenance
  
  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users with proper access control
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE vehicle_type AS ENUM (
    'bus',
    'van',
    'suv',
    'sedan',
    'minibus',
    'truck',
    'motorcycle',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status_type AS ENUM (
    'confirmed',
    'pending',
    'cancelled',
    'maintenance'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create trip_transportation_providers table
CREATE TABLE IF NOT EXISTS trip_transportation_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trip_vehicles table
CREATE TABLE IF NOT EXISTS trip_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES trip_transportation_providers(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES trip_staff(id) ON DELETE SET NULL,
  vehicle_type vehicle_type NOT NULL,
  vehicle_type_custom text,
  license_plate text,
  model text,
  color text,
  passenger_capacity integer NOT NULL DEFAULT 4,
  status vehicle_status_type DEFAULT 'pending',
  has_ac boolean DEFAULT true,
  has_wifi boolean DEFAULT false,
  is_accessible boolean DEFAULT false,
  insurance_valid boolean DEFAULT false,
  insurance_expiry date,
  last_maintenance date,
  fuel_type text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trip_vehicle_day_assignments table
CREATE TABLE IF NOT EXISTS trip_vehicle_day_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES trip_vehicles(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  pickup_time time,
  pickup_location text,
  dropoff_time time,
  dropoff_location text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id, day_id)
);

-- Create trip_vehicle_activity_assignments table
CREATE TABLE IF NOT EXISTS trip_vehicle_activity_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES trip_vehicles(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  pickup_time time,
  pickup_location text,
  dropoff_time time,
  dropoff_location text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_id, activity_id)
);

-- Enable RLS
ALTER TABLE trip_transportation_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_vehicle_day_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_vehicle_activity_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for trip_transportation_providers
CREATE POLICY "Users can view providers for trips they have access to"
  ON trip_transportation_providers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'guide')
    )
    OR EXISTS (
      SELECT 1 FROM trip_shares 
      WHERE trip_id = trip_transportation_providers.trip_id 
      AND shared_with = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM trips
      WHERE id = trip_transportation_providers.trip_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert providers if they have edit permission"
  ON trip_transportation_providers FOR INSERT
  TO authenticated
  WITH CHECK (has_staff_edit_permission(trip_id));

CREATE POLICY "Users can update providers if they have edit permission"
  ON trip_transportation_providers FOR UPDATE
  TO authenticated
  USING (has_staff_edit_permission(trip_id))
  WITH CHECK (has_staff_edit_permission(trip_id));

CREATE POLICY "Users can delete providers if they have edit permission"
  ON trip_transportation_providers FOR DELETE
  TO authenticated
  USING (has_staff_edit_permission(trip_id));

-- Policies for trip_vehicles
CREATE POLICY "Users can view vehicles for trips they have access to"
  ON trip_vehicles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'guide')
    )
    OR EXISTS (
      SELECT 1 FROM trip_shares 
      WHERE trip_id = trip_vehicles.trip_id 
      AND shared_with = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM trips
      WHERE id = trip_vehicles.trip_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert vehicles if they have edit permission"
  ON trip_vehicles FOR INSERT
  TO authenticated
  WITH CHECK (has_staff_edit_permission(trip_id));

CREATE POLICY "Users can update vehicles if they have edit permission"
  ON trip_vehicles FOR UPDATE
  TO authenticated
  USING (has_staff_edit_permission(trip_id))
  WITH CHECK (has_staff_edit_permission(trip_id));

CREATE POLICY "Users can delete vehicles if they have edit permission"
  ON trip_vehicles FOR DELETE
  TO authenticated
  USING (has_staff_edit_permission(trip_id));

-- Policies for trip_vehicle_day_assignments
CREATE POLICY "Users can view day assignments for trips they have access to"
  ON trip_vehicle_day_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_vehicles tv
      JOIN trips t ON tv.trip_id = t.id
      WHERE tv.id = trip_vehicle_day_assignments.vehicle_id
      AND (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'guide'))
        OR EXISTS (SELECT 1 FROM trip_shares WHERE trip_id = t.id AND shared_with = auth.uid())
        OR t.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert day assignments if they have edit permission"
  ON trip_vehicle_day_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_vehicles tv
      JOIN trips t ON tv.trip_id = t.id
      WHERE tv.id = vehicle_id
      AND has_staff_edit_permission(t.id)
    )
  );

CREATE POLICY "Users can update day assignments if they have edit permission"
  ON trip_vehicle_day_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_vehicles tv
      JOIN trips t ON tv.trip_id = t.id
      WHERE tv.id = vehicle_id
      AND has_staff_edit_permission(t.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_vehicles tv
      JOIN trips t ON tv.trip_id = t.id
      WHERE tv.id = vehicle_id
      AND has_staff_edit_permission(t.id)
    )
  );

CREATE POLICY "Users can delete day assignments if they have edit permission"
  ON trip_vehicle_day_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_vehicles tv
      JOIN trips t ON tv.trip_id = t.id
      WHERE tv.id = vehicle_id
      AND has_staff_edit_permission(t.id)
    )
  );

-- Policies for trip_vehicle_activity_assignments
CREATE POLICY "Users can view activity assignments for trips they have access to"
  ON trip_vehicle_activity_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_vehicles tv
      JOIN trips t ON tv.trip_id = t.id
      WHERE tv.id = trip_vehicle_activity_assignments.vehicle_id
      AND (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'guide'))
        OR EXISTS (SELECT 1 FROM trip_shares WHERE trip_id = t.id AND shared_with = auth.uid())
        OR t.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert activity assignments if they have edit permission"
  ON trip_vehicle_activity_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_vehicles tv
      JOIN trips t ON tv.trip_id = t.id
      WHERE tv.id = vehicle_id
      AND has_staff_edit_permission(t.id)
    )
  );

CREATE POLICY "Users can update activity assignments if they have edit permission"
  ON trip_vehicle_activity_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_vehicles tv
      JOIN trips t ON tv.trip_id = t.id
      WHERE tv.id = vehicle_id
      AND has_staff_edit_permission(t.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_vehicles tv
      JOIN trips t ON tv.trip_id = t.id
      WHERE tv.id = vehicle_id
      AND has_staff_edit_permission(t.id)
    )
  );

CREATE POLICY "Users can delete activity assignments if they have edit permission"
  ON trip_vehicle_activity_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_vehicles tv
      JOIN trips t ON tv.trip_id = t.id
      WHERE tv.id = vehicle_id
      AND has_staff_edit_permission(t.id)
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transport_providers_trip_id ON trip_transportation_providers(trip_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_trip_id ON trip_vehicles(trip_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_provider_id ON trip_vehicles(provider_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON trip_vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON trip_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_day_assignments_vehicle_id ON trip_vehicle_day_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_day_assignments_day_id ON trip_vehicle_day_assignments(day_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_assignments_vehicle_id ON trip_vehicle_activity_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_assignments_activity_id ON trip_vehicle_activity_assignments(activity_id);