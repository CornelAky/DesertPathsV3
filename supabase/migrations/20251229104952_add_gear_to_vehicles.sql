/*
  # Add Gear Field to Vehicles
  
  1. Changes
    - Add gear column to trip_vehicles table
    - Gear is stored as an array of text values
    - Allows tracking equipment/gear provided with each vehicle
  
  2. Predefined Gear Options
    - Recovery Kit (Compressor, Snatch Strap, Sand Tracks)
    - Camping Set (Awning, Chairs, Table)
    - Fridge/Cooler
    - Communication (Walkie-Talkie, Satellite Phone)
    - First Aid & Tool Kit
  
  3. Notes
    - Uses text[] (array) to store multiple gear items per vehicle
    - Default is an empty array
    - Allows flexibility for custom gear items
*/

-- Add gear column to trip_vehicles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_vehicles' AND column_name = 'gear'
  ) THEN
    ALTER TABLE trip_vehicles ADD COLUMN gear text[] DEFAULT '{}';
  END IF;
END $$;

-- Add index for gear queries
CREATE INDEX IF NOT EXISTS idx_trip_vehicles_gear ON trip_vehicles USING GIN(gear);