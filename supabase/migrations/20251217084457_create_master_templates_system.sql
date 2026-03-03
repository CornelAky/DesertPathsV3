/*
  # Master Templates System

  1. New Tables
    - `trip_templates`
      - Stores trip template metadata (name, type, duration, default flag)
      - Owned by admin users
    - `template_days`
      - Stores day structure for trip templates
      - Each template can have multiple days
    - `template_activities`
      - Stores default activities for template days
      - Pre-configured activities with timing and details
    - `template_dining`
      - Stores default dining entries for template days
      - Pre-configured meals with timing and details
    - `template_accommodations`
      - Stores default accommodation entries for template days
      - Pre-configured hotel information
    - `dining_templates`
      - Standalone dining templates for quick reuse
    - `accommodation_templates`
      - Standalone accommodation templates for quick reuse

  2. Security
    - Enable RLS on all tables
    - Admins can create, read, update, and delete templates
    - All users can read templates (for trip creation)

  3. Features
    - Template types: 3 days, 5 days, family, VIP, custom
    - Default template flag
    - Order indexes for proper sequencing
    - Comprehensive template data structure
*/

-- Create enum for template types
DO $$ BEGIN
  CREATE TYPE template_type AS ENUM ('3_days', '5_days', 'family', 'vip', 'custom');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Trip Templates table
CREATE TABLE IF NOT EXISTS trip_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  template_type template_type NOT NULL DEFAULT 'custom',
  duration_days integer NOT NULL DEFAULT 3,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Template Days table
CREATE TABLE IF NOT EXISTS template_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES trip_templates(id) ON DELETE CASCADE NOT NULL,
  day_number integer NOT NULL,
  title text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(template_id, day_number)
);

-- Template Activities table
CREATE TABLE IF NOT EXISTS template_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_day_id uuid REFERENCES template_days(id) ON DELETE CASCADE NOT NULL,
  activity_name text NOT NULL,
  location text DEFAULT '',
  start_time time,
  end_time time,
  notes text DEFAULT '',
  booking_status text DEFAULT 'pending',
  booking_fee numeric(10, 2) DEFAULT 0,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Template Dining table
CREATE TABLE IF NOT EXISTS template_dining (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_day_id uuid REFERENCES template_days(id) ON DELETE CASCADE NOT NULL,
  restaurant_name text NOT NULL,
  meal_type text NOT NULL DEFAULT 'lunch',
  location text DEFAULT '',
  reservation_time time,
  notes text DEFAULT '',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Template Accommodations table
CREATE TABLE IF NOT EXISTS template_accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_day_id uuid REFERENCES template_days(id) ON DELETE CASCADE NOT NULL,
  hotel_name text NOT NULL,
  location_address text DEFAULT '',
  check_in_time time,
  check_out_time time,
  access_method text DEFAULT 'self_checkin',
  confirmation_number text DEFAULT '',
  notes text DEFAULT '',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Standalone Dining Templates table
CREATE TABLE IF NOT EXISTS dining_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  restaurant_name text NOT NULL,
  meal_type text NOT NULL DEFAULT 'lunch',
  location text DEFAULT '',
  reservation_time time,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Standalone Accommodation Templates table
CREATE TABLE IF NOT EXISTS accommodation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hotel_name text NOT NULL,
  location_address text DEFAULT '',
  access_method text DEFAULT 'self_checkin',
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_template_days_template_id ON template_days(template_id);
CREATE INDEX IF NOT EXISTS idx_template_activities_day_id ON template_activities(template_day_id);
CREATE INDEX IF NOT EXISTS idx_template_dining_day_id ON template_dining(template_day_id);
CREATE INDEX IF NOT EXISTS idx_template_accommodations_day_id ON template_accommodations(template_day_id);

-- Enable RLS
ALTER TABLE trip_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_dining ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_templates
CREATE POLICY "Anyone can view templates"
  ON trip_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert templates"
  ON trip_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update templates"
  ON trip_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete templates"
  ON trip_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for template_days
CREATE POLICY "Anyone can view template days"
  ON template_days FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert template days"
  ON template_days FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update template days"
  ON template_days FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete template days"
  ON template_days FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for template_activities
CREATE POLICY "Anyone can view template activities"
  ON template_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert template activities"
  ON template_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update template activities"
  ON template_activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete template activities"
  ON template_activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for template_dining
CREATE POLICY "Anyone can view template dining"
  ON template_dining FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert template dining"
  ON template_dining FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update template dining"
  ON template_dining FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete template dining"
  ON template_dining FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for template_accommodations
CREATE POLICY "Anyone can view template accommodations"
  ON template_accommodations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert template accommodations"
  ON template_accommodations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update template accommodations"
  ON template_accommodations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete template accommodations"
  ON template_accommodations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for dining_templates
CREATE POLICY "Anyone can view dining templates"
  ON dining_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert dining templates"
  ON dining_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update dining templates"
  ON dining_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete dining templates"
  ON dining_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for accommodation_templates
CREATE POLICY "Anyone can view accommodation templates"
  ON accommodation_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert accommodation templates"
  ON accommodation_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update accommodation templates"
  ON accommodation_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete accommodation templates"
  ON accommodation_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Update timestamps trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
DO $$ BEGIN
  CREATE TRIGGER update_trip_templates_updated_at
    BEFORE UPDATE ON trip_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_dining_templates_updated_at
    BEFORE UPDATE ON dining_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_accommodation_templates_updated_at
    BEFORE UPDATE ON accommodation_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
