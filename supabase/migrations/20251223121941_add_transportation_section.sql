/*
  # Add Transportation Section to Itinerary Days

  1. New Tables
    - `transportation`
      - `id` (uuid, primary key)
      - `day_id` (uuid, foreign key to itinerary_days)
      - `driver_name` (text) - Name of the driver
      - `car_type` (text) - Type of vehicle
      - `driver_phone` (text) - Contact number for driver
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `transportation` table
    - Add policies for authenticated users to manage transportation
    - Admins can view, create, update, and delete all transportation entries
    - Guides can view transportation for trips shared with them and edit their own copies

  3. Important Notes
    - Transportation section appears between Accommodation and Activities in the day-by-day view
    - Each itinerary day can have multiple transportation entries (for different segments)
    - Phone numbers stored as text to allow international formats
*/

-- Create transportation table
CREATE TABLE IF NOT EXISTS transportation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  driver_name text DEFAULT '',
  car_type text DEFAULT '',
  driver_phone text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transportation ENABLE ROW LEVEL SECURITY;

-- Create policies for transportation
CREATE POLICY "Admins can view all transportation"
  ON transportation FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert transportation"
  ON transportation FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update all transportation"
  ON transportation FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete transportation"
  ON transportation FOR DELETE
  TO authenticated
  USING (is_admin());

-- Guides can view transportation for shared trips
CREATE POLICY "Guides can view transportation for shared trips"
  ON transportation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN trips t ON t.id = d.trip_id
      JOIN trip_shares ts ON ts.trip_id = t.id
      WHERE d.id = transportation.day_id
      AND ts.shared_with = auth.uid()
      AND ts.is_active = true
      AND ts.revoked_at IS NULL
    )
  );

-- Guides can view transportation for their own driver copies
CREATE POLICY "Guides can view transportation for their driver copies"
  ON transportation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = transportation.day_id
      AND t.created_by = auth.uid()
      AND t.is_driver_copy = true
    )
  );

-- Guides can edit transportation for their own driver copies
CREATE POLICY "Guides can insert transportation for their driver copies"
  ON transportation FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = transportation.day_id
      AND t.created_by = auth.uid()
      AND t.is_driver_copy = true
    )
  );

CREATE POLICY "Guides can update transportation for their driver copies"
  ON transportation FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = transportation.day_id
      AND t.created_by = auth.uid()
      AND t.is_driver_copy = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = transportation.day_id
      AND t.created_by = auth.uid()
      AND t.is_driver_copy = true
    )
  );

CREATE POLICY "Guides can delete transportation for their driver copies"
  ON transportation FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = transportation.day_id
      AND t.created_by = auth.uid()
      AND t.is_driver_copy = true
    )
  );

-- Users with edit permission can modify transportation
CREATE POLICY "Users with edit permission can view transportation"
  ON transportation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = transportation.day_id
      AND has_edit_permission(t.id)
    )
  );

CREATE POLICY "Users with edit permission can insert transportation"
  ON transportation FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = transportation.day_id
      AND has_edit_permission(t.id)
    )
  );

CREATE POLICY "Users with edit permission can update transportation"
  ON transportation FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = transportation.day_id
      AND has_edit_permission(t.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = transportation.day_id
      AND has_edit_permission(t.id)
    )
  );

CREATE POLICY "Users with edit permission can delete transportation"
  ON transportation FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN trips t ON t.id = d.trip_id
      WHERE d.id = transportation.day_id
      AND has_edit_permission(t.id)
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transportation_day_id ON transportation(day_id);