/*
  # Create Property Management Schema

  1. New Tables
    - `properties`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `property_type` (text: 'hotel', 'restaurant', 'venue')
      - `name` (text)
      - `address` (text)
      - `phone` (text)
      - `email` (text)
      - `working_hours_start` (time)
      - `working_hours_end` (time)
      - `weekly_holidays` (jsonb array of day names)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)
  
  2. Security
    - Enable RLS on `properties` table
    - Add policies for authenticated users to manage properties
*/

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  property_type text NOT NULL CHECK (property_type IN ('hotel', 'restaurant', 'venue', 'other')),
  name text NOT NULL,
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  working_hours_start time,
  working_hours_end time,
  weekly_holidays jsonb DEFAULT '[]'::jsonb,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS properties_trip_id_idx ON properties(trip_id);
CREATE INDEX IF NOT EXISTS properties_property_type_idx ON properties(property_type);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view all properties"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete properties"
  ON properties FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_properties_updated_at_trigger
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_properties_updated_at();
