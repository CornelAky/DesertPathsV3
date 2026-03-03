/*
  # Add Trip Gear Management

  1. New Tables
    - `trip_gear`
      - `id` (uuid, primary key) - Unique identifier for each gear item
      - `trip_id` (uuid, foreign key) - Reference to trips table
      - `item_name` (text) - Name of the gear/equipment item
      - `quantity` (integer) - Number of items
      - `notes` (text, optional) - Additional notes about the gear
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `trip_gear` table
    - Add policies for authenticated users to:
      - View gear for trips they have access to
      - Edit gear for trips they have edit permission on
      - Delete gear for trips they have edit permission on

  3. Purpose
    - Manage equipment needed for tourism trips separately from vehicles
    - Track camping gear, cooking tools, safety equipment, etc.
    - Independent from vehicle-specific gear
*/

-- Create trip_gear table
CREATE TABLE IF NOT EXISTS trip_gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  item_name text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE trip_gear ENABLE ROW LEVEL SECURITY;

-- Create policies for trip_gear
CREATE POLICY "Users can view gear for accessible trips"
  ON trip_gear FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_gear.trip_id
      AND (
        trips.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_shares
          WHERE trip_shares.trip_id = trips.id
          AND trip_shares.shared_with = auth.uid()
          AND trip_shares.is_active = true
        )
        OR is_admin()
      )
    )
  );

CREATE POLICY "Users can insert gear for editable trips"
  ON trip_gear FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_gear.trip_id
      AND (
        trips.created_by = auth.uid()
        OR has_edit_permission(trips.id)
      )
    )
  );

CREATE POLICY "Users can update gear for editable trips"
  ON trip_gear FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_gear.trip_id
      AND (
        trips.created_by = auth.uid()
        OR has_edit_permission(trips.id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_gear.trip_id
      AND (
        trips.created_by = auth.uid()
        OR has_edit_permission(trips.id)
      )
    )
  );

CREATE POLICY "Users can delete gear for editable trips"
  ON trip_gear FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_gear.trip_id
      AND (
        trips.created_by = auth.uid()
        OR has_edit_permission(trips.id)
      )
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_trip_gear_trip_id ON trip_gear(trip_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_trip_gear_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_trip_gear_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_trip_gear_updated_at_trigger
      BEFORE UPDATE ON trip_gear
      FOR EACH ROW
      EXECUTE FUNCTION update_trip_gear_updated_at();
  END IF;
END $$;
