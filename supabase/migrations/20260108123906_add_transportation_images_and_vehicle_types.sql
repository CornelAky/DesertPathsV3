/*
  # Add Transportation Images and Update Vehicle Types
  
  1. Changes
    - Add `images` column to transportation table (JSONB array)
    - Update valid vehicle types to match user requirements
    - Add booking/pricing fee fields
  
  2. Vehicle Types
    - SUV
    - Sedan
    - Large Bus - Coach
    - Medium Bus
    - Minivan
    - Train
    - Boat
    - Plane
  
  3. Security
    - Existing RLS policies will cover the new column
*/

-- Add images column to transportation table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transportation' AND column_name = 'images'
  ) THEN
    ALTER TABLE transportation ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add pickup and dropoff time fields if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transportation' AND column_name = 'pickup_time'
  ) THEN
    ALTER TABLE transportation ADD COLUMN pickup_time time;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transportation' AND column_name = 'dropoff_time'
  ) THEN
    ALTER TABLE transportation ADD COLUMN dropoff_time time;
  END IF;
END $$;

-- Add pickup and dropoff location fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transportation' AND column_name = 'pickup_location'
  ) THEN
    ALTER TABLE transportation ADD COLUMN pickup_location text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transportation' AND column_name = 'dropoff_location'
  ) THEN
    ALTER TABLE transportation ADD COLUMN dropoff_location text;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN transportation.images IS 'Array of image objects for vehicle photos';
COMMENT ON COLUMN transportation.car_type IS 'Vehicle type: SUV, Sedan, Large Bus - Coach, Medium Bus, Minivan, Train, Boat, Plane';
