/*
  # Add Section Toggles and Accommodation Types

  1. Changes to `itinerary_days` table
    - Add `early_morning_section_enabled` (boolean) - Controls visibility of early morning activity section
    - Add `night_section_enabled` (boolean) - Controls visibility of night activity section
    - Add `breakfast_section_enabled` (boolean) - Controls visibility of breakfast section
    - Add `lunch_section_enabled` (boolean) - Controls visibility of lunch section
    - Add `dinner_section_enabled` (boolean) - Controls visibility of dinner section
    - All sections enabled by default for backward compatibility

  2. Changes to `accommodations` table
    - Add `accommodation_type` (text) - Differentiates between 'guest' and 'staff' accommodations
    - Defaults to 'guest' for existing records

  3. Security
    - Maintain existing RLS policies
    - No changes needed as new fields follow existing patterns
*/

-- Add section visibility toggles to itinerary_days
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_days' AND column_name = 'early_morning_section_enabled'
  ) THEN
    ALTER TABLE itinerary_days ADD COLUMN early_morning_section_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_days' AND column_name = 'night_section_enabled'
  ) THEN
    ALTER TABLE itinerary_days ADD COLUMN night_section_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_days' AND column_name = 'breakfast_section_enabled'
  ) THEN
    ALTER TABLE itinerary_days ADD COLUMN breakfast_section_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_days' AND column_name = 'lunch_section_enabled'
  ) THEN
    ALTER TABLE itinerary_days ADD COLUMN lunch_section_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_days' AND column_name = 'dinner_section_enabled'
  ) THEN
    ALTER TABLE itinerary_days ADD COLUMN dinner_section_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Add accommodation_type to accommodations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accommodations' AND column_name = 'accommodation_type'
  ) THEN
    ALTER TABLE accommodations ADD COLUMN accommodation_type text DEFAULT 'guest' CHECK (accommodation_type IN ('guest', 'staff'));
  END IF;
END $$;