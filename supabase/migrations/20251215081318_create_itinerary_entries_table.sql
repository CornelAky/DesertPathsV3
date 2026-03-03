/*
  # Create Itinerary Entries Table - Central Itinerary Reference
  
  1. Purpose
    - Creates the main itinerary table that serves as the single source of truth
    - Acts as the central reference for both admin and trip leaders
    - Supports multi-day programs with sortable entries
  
  2. New Tables
    - `itinerary_entries`
      - `id` (uuid, primary key) - Unique identifier
      - `trip_id` (uuid, foreign key) - Links to trips table
      - `day_number` (integer) - Day number in the trip
      - `date` (date) - Specific date for this entry
      - `time` (time) - Time of day for this entry
      - `activity` (text) - Activity description
      - `location` (text) - Location name
      - `accommodation_id` (uuid, foreign key, nullable) - Link to accommodations table
      - `dining_id` (uuid, foreign key, nullable) - Link to dining table
      - `activity_id` (uuid, foreign key, nullable) - Link to activities table
      - `access_method` (text) - How to access the location
      - `transportation` (text) - Transportation details
      - `notes` (text) - Additional comments or notes
      - `sort_order` (integer) - Manual sorting within a day
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  3. Security
    - Enable RLS on itinerary_entries table
    - Authenticated users can view entries for their assigned trips
    - Only admin users can create, update, or delete entries
  
  4. Indexes
    - Index on trip_id for fast trip queries
    - Index on day_number and time for sorting
    - Index on date for date-based queries
*/

-- Create itinerary_entries table
CREATE TABLE IF NOT EXISTS itinerary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number integer NOT NULL DEFAULT 1,
  date date,
  time time,
  activity text DEFAULT '',
  location text DEFAULT '',
  accommodation_id uuid REFERENCES accommodations(id) ON DELETE SET NULL,
  dining_id uuid REFERENCES dining(id) ON DELETE SET NULL,
  activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  access_method text DEFAULT '',
  transportation text DEFAULT '',
  notes text DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS itinerary_entries_trip_id_idx ON itinerary_entries(trip_id);
CREATE INDEX IF NOT EXISTS itinerary_entries_day_time_idx ON itinerary_entries(day_number, time);
CREATE INDEX IF NOT EXISTS itinerary_entries_date_idx ON itinerary_entries(date);

-- Enable RLS
ALTER TABLE itinerary_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view itinerary entries for trips they're assigned to
CREATE POLICY "Users can view itinerary entries for assigned trips"
  ON itinerary_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = itinerary_entries.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admin users can insert itinerary entries
CREATE POLICY "Admin users can insert itinerary entries"
  ON itinerary_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admin users can update itinerary entries
CREATE POLICY "Admin users can update itinerary entries"
  ON itinerary_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admin users can delete itinerary entries
CREATE POLICY "Admin users can delete itinerary entries"
  ON itinerary_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_itinerary_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_itinerary_entries_updated_at
  BEFORE UPDATE ON itinerary_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_itinerary_entries_updated_at();
