/*
  # Consolidate Transportation Contact Fields
  
  1. Changes
    - Add new contact_details field to replace driver_name and driver_phone
    - Add pickup_location_link and dropoff_location_link fields
    - Migrate existing data from driver_name and driver_phone to contact_details
    - Drop old driver_name and driver_phone columns
  
  2. Data Migration
    - Combine driver_name and driver_phone into single contact_details field
    - Format: "Name: [driver_name]\nPhone: [driver_phone]"
*/

-- Add new contact_details field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transportation' AND column_name = 'contact_details'
  ) THEN
    ALTER TABLE transportation ADD COLUMN contact_details text;
  END IF;
END $$;

-- Add location link fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transportation' AND column_name = 'pickup_location_link'
  ) THEN
    ALTER TABLE transportation ADD COLUMN pickup_location_link text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transportation' AND column_name = 'dropoff_location_link'
  ) THEN
    ALTER TABLE transportation ADD COLUMN dropoff_location_link text;
  END IF;
END $$;

-- Migrate existing data to contact_details
UPDATE transportation
SET contact_details = 
  CASE 
    WHEN driver_name IS NOT NULL AND driver_phone IS NOT NULL THEN
      driver_name || E'\n' || driver_phone
    WHEN driver_name IS NOT NULL THEN
      driver_name
    WHEN driver_phone IS NOT NULL THEN
      driver_phone
    ELSE
      ''
  END
WHERE contact_details IS NULL;

-- Drop old columns
ALTER TABLE transportation DROP COLUMN IF EXISTS driver_name;
ALTER TABLE transportation DROP COLUMN IF EXISTS driver_phone;

-- Add comments
COMMENT ON COLUMN transportation.contact_details IS 'Combined contact information for driver/operator';
COMMENT ON COLUMN transportation.pickup_location_link IS 'Google Maps or other location link for pickup';
COMMENT ON COLUMN transportation.dropoff_location_link IS 'Google Maps or other location link for dropoff';
