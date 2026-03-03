/*
  # Add Completion Status and Payment Fields

  1. New Fields
    - Add `is_completed` (boolean) to:
      - accommodations
      - activities
      - dining
      - transportation
      - itinerary_days
    - Add `paid_by` (text) to:
      - activities
      - dining
    
  2. Changes to Existing Fields
    - Remove `payment_arrangement` from dining
    - Remove `included_in_package` from dining
    - Update payment_status to support new values
  
  3. Default Values
    - is_completed defaults to false
    - paid_by defaults to 'desert_paths'
*/

-- Add is_completed to accommodations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accommodations' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE accommodations ADD COLUMN is_completed boolean DEFAULT false;
  END IF;
END $$;

-- Add is_completed to activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE activities ADD COLUMN is_completed boolean DEFAULT false;
  END IF;
END $$;

-- Add paid_by to activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'paid_by'
  ) THEN
    ALTER TABLE activities ADD COLUMN paid_by text DEFAULT 'desert_paths';
  END IF;
END $$;

-- Add is_completed to dining
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE dining ADD COLUMN is_completed boolean DEFAULT false;
  END IF;
END $$;

-- Add paid_by to dining
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'paid_by'
  ) THEN
    ALTER TABLE dining ADD COLUMN paid_by text DEFAULT 'desert_paths';
  END IF;
END $$;

-- Drop payment_arrangement from dining if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'payment_arrangement'
  ) THEN
    ALTER TABLE dining DROP COLUMN payment_arrangement;
  END IF;
END $$;

-- Drop included_in_package from dining if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'included_in_package'
  ) THEN
    ALTER TABLE dining DROP COLUMN included_in_package;
  END IF;
END $$;

-- Add is_completed to transportation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transportation' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE transportation ADD COLUMN is_completed boolean DEFAULT false;
  END IF;
END $$;

-- Add is_completed to itinerary_days
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_days' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE itinerary_days ADD COLUMN is_completed boolean DEFAULT false;
  END IF;
END $$;