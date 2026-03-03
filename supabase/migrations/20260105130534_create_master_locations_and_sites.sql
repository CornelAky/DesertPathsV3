/*
  # Create Master Locations and Sites Database

  ## Overview
  This migration creates master database tables for commonly used locations and touristic sites.

  ## New Tables
  1. master_hotels - Hotels and accommodations database
  2. master_restaurants - Restaurants database
  3. master_touristic_sites - Touristic sites and activities database
  4. master_site_fees - Fees associated with touristic sites

  ## Security
  - Enable RLS on all tables
  - Managers and admins can manage master data
  - All authenticated users can view master data
*/

-- Create master_hotels table
CREATE TABLE IF NOT EXISTS master_hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  city text,
  contact_number text,
  email text,
  map_link text,
  accommodation_type text CHECK (accommodation_type IN ('hotel', 'resort', 'camp', 'villa', 'apartment', 'guesthouse', 'lodge')),
  check_in_time time,
  check_out_time time,
  room_types text,
  amenities text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create master_restaurants table
CREATE TABLE IF NOT EXISTS master_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  city text,
  contact_number text,
  cuisine_type text,
  map_link text,
  meal_types text[] DEFAULT '{}',
  average_cost_per_person numeric(10, 2),
  currency text DEFAULT 'SAR',
  capacity integer,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create master_touristic_sites table
CREATE TABLE IF NOT EXISTS master_touristic_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text CHECK (category IN ('museum', 'monument', 'park', 'attraction', 'activity', 'experience', 'tour', 'other')),
  location text,
  city text,
  contact_number text,
  map_link text,
  typical_duration_minutes integer,
  description text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create master_site_fees table
CREATE TABLE IF NOT EXISTS master_site_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES master_touristic_sites(id) ON DELETE CASCADE,
  fee_name text NOT NULL,
  applies_to text NOT NULL CHECK (applies_to IN ('guest', 'guide', 'driver', 'group')),
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'SAR',
  per_person boolean DEFAULT true,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_master_hotels_name ON master_hotels(name);
CREATE INDEX IF NOT EXISTS idx_master_hotels_city ON master_hotels(city);
CREATE INDEX IF NOT EXISTS idx_master_hotels_active ON master_hotels(is_active);

CREATE INDEX IF NOT EXISTS idx_master_restaurants_name ON master_restaurants(name);
CREATE INDEX IF NOT EXISTS idx_master_restaurants_city ON master_restaurants(city);
CREATE INDEX IF NOT EXISTS idx_master_restaurants_active ON master_restaurants(is_active);

CREATE INDEX IF NOT EXISTS idx_master_sites_name ON master_touristic_sites(name);
CREATE INDEX IF NOT EXISTS idx_master_sites_city ON master_touristic_sites(city);
CREATE INDEX IF NOT EXISTS idx_master_sites_category ON master_touristic_sites(category);
CREATE INDEX IF NOT EXISTS idx_master_sites_active ON master_touristic_sites(is_active);

CREATE INDEX IF NOT EXISTS idx_master_site_fees_site_id ON master_site_fees(site_id);
CREATE INDEX IF NOT EXISTS idx_master_site_fees_active ON master_site_fees(is_active);

-- Enable RLS
ALTER TABLE master_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_touristic_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_site_fees ENABLE ROW LEVEL SECURITY;

-- Policies for master_hotels
CREATE POLICY "All authenticated users can view hotels"
  ON master_hotels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert hotels"
  ON master_hotels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update hotels"
  ON master_hotels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can delete hotels"
  ON master_hotels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

-- Policies for master_restaurants
CREATE POLICY "All authenticated users can view restaurants"
  ON master_restaurants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert restaurants"
  ON master_restaurants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update restaurants"
  ON master_restaurants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can delete restaurants"
  ON master_restaurants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

-- Policies for master_touristic_sites
CREATE POLICY "All authenticated users can view touristic sites"
  ON master_touristic_sites FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert touristic sites"
  ON master_touristic_sites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update touristic sites"
  ON master_touristic_sites FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can delete touristic sites"
  ON master_touristic_sites FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

-- Policies for master_site_fees
CREATE POLICY "All authenticated users can view site fees"
  ON master_site_fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert site fees"
  ON master_site_fees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update site fees"
  ON master_site_fees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can delete site fees"
  ON master_site_fees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

-- Create triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_master_hotels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_master_hotels_updated_at
  BEFORE UPDATE ON master_hotels
  FOR EACH ROW
  EXECUTE FUNCTION update_master_hotels_updated_at();

CREATE OR REPLACE FUNCTION update_master_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_master_restaurants_updated_at
  BEFORE UPDATE ON master_restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_master_restaurants_updated_at();

CREATE OR REPLACE FUNCTION update_master_touristic_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_master_touristic_sites_updated_at
  BEFORE UPDATE ON master_touristic_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_master_touristic_sites_updated_at();

CREATE OR REPLACE FUNCTION update_master_site_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_master_site_fees_updated_at
  BEFORE UPDATE ON master_site_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_master_site_fees_updated_at();