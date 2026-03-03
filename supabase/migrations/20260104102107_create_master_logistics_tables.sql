/*
  # Create Master Logistics Tables
  
  1. New Tables
    - `master_transportation_providers` - Reusable provider records
    - `master_vehicles` - Reusable vehicle records
    - `master_gear` - Reusable gear records
  
  2. Changes to Existing Tables
    - Add `master_provider_id` to `journey_transportation_providers`
    - Add `master_vehicle_id` to `journey_vehicles`
    - Add `master_gear_id` to `journey_gear`
  
  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
    - Managers and admins can manage master lists
*/

-- Create master transportation providers table
CREATE TABLE IF NOT EXISTS master_transportation_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create master vehicles table
CREATE TABLE IF NOT EXISTS master_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type text NOT NULL,
  vehicle_type_custom text,
  license_plate text,
  model text,
  color text,
  passenger_capacity integer NOT NULL DEFAULT 4,
  has_ac boolean DEFAULT true,
  has_wifi boolean DEFAULT false,
  is_accessible boolean DEFAULT false,
  insurance_valid boolean DEFAULT false,
  insurance_expiry date,
  last_maintenance date,
  fuel_type text,
  notes text DEFAULT '',
  gear text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create master gear table
CREATE TABLE IF NOT EXISTS master_gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add master reference columns to journey tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journey_transportation_providers' AND column_name = 'master_provider_id'
  ) THEN
    ALTER TABLE journey_transportation_providers 
      ADD COLUMN master_provider_id uuid REFERENCES master_transportation_providers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journey_vehicles' AND column_name = 'master_vehicle_id'
  ) THEN
    ALTER TABLE journey_vehicles 
      ADD COLUMN master_vehicle_id uuid REFERENCES master_vehicles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journey_gear' AND column_name = 'master_gear_id'
  ) THEN
    ALTER TABLE journey_gear 
      ADD COLUMN master_gear_id uuid REFERENCES master_gear(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE master_transportation_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_gear ENABLE ROW LEVEL SECURITY;

-- Policies for master_transportation_providers
CREATE POLICY "Authenticated users can view master providers"
  ON master_transportation_providers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert master providers"
  ON master_transportation_providers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers and admins can update master providers"
  ON master_transportation_providers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers and admins can delete master providers"
  ON master_transportation_providers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Policies for master_vehicles
CREATE POLICY "Authenticated users can view master vehicles"
  ON master_vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert master vehicles"
  ON master_vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers and admins can update master vehicles"
  ON master_vehicles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers and admins can delete master vehicles"
  ON master_vehicles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Policies for master_gear
CREATE POLICY "Authenticated users can view master gear"
  ON master_gear FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert master gear"
  ON master_gear FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers and admins can update master gear"
  ON master_gear FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers and admins can delete master gear"
  ON master_gear FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
