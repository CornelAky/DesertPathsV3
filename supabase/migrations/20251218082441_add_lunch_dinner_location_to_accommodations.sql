/*
  # Add Meal Location Options for Lunch and Dinner
  
  1. Changes
    - Add `lunch_location` column to accommodations table
    - Add `dinner_location` column to accommodations table
    - Both columns accept 'in_hotel' or 'external' values
    - Both columns are nullable (only set when meal is included)
    
  2. Purpose
    - Allow users to specify where lunch and dinner are served
    - Matches existing breakfast_location functionality
    - Provides flexibility for meal arrangement tracking
    
  3. Security
    - Existing RLS policies automatically apply to these new columns
*/

-- Add lunch_location column to accommodations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accommodations' AND column_name = 'lunch_location'
  ) THEN
    ALTER TABLE accommodations 
    ADD COLUMN lunch_location text 
    CHECK (lunch_location IN ('in_hotel', 'external') OR lunch_location IS NULL);
  END IF;
END $$;

-- Add dinner_location column to accommodations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accommodations' AND column_name = 'dinner_location'
  ) THEN
    ALTER TABLE accommodations 
    ADD COLUMN dinner_location text 
    CHECK (dinner_location IN ('in_hotel', 'external') OR dinner_location IS NULL);
  END IF;
END $$;