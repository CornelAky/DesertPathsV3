/*
  # Update Payment Status to Two-Tier System

  1. Changes to Dining Table
    - Current payment_status contains payer info: 'desert_paths', 'paid_by_client', 'not_included'
    - Add `paid_by` field with values: 'desert_paths' or 'client'
    - Migrate current payment_status values to paid_by
    - Update payment_status to have values: 'pending', 'pre_paid', 'paid_on_site', 'n_a'
    - Remove old `payment_arrangement` field
    - Remove old `included_in_package` field

  2. Changes to Activities Table  
    - Add `paid_by` field with values: 'desert_paths' or 'client'
    - Update `payment_status` field to have values: 'pending', 'pre_paid', 'paid_on_site', 'n_a'
    - Migrate existing payment_status values to new format

  3. Security
    - No RLS changes needed as tables already have proper policies
*/

-- ===== DINING TABLE =====

-- Drop existing payment_status constraint
ALTER TABLE dining DROP CONSTRAINT IF EXISTS dining_payment_status_check;

-- Add paid_by field (if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'paid_by'
  ) THEN
    ALTER TABLE dining ADD COLUMN paid_by text;
  END IF;
END $$;

-- Migrate current payment_status (which contains payer info) to paid_by
UPDATE dining 
SET paid_by = CASE
  WHEN payment_status = 'paid_by_client' THEN 'client'
  WHEN payment_status = 'desert_paths' THEN 'desert_paths'
  WHEN payment_status = 'not_included' THEN NULL
  ELSE NULL
END;

-- Set default payment_status values based on confirmation_status
UPDATE dining 
SET payment_status = CASE
  WHEN confirmation_status = 'confirmed' THEN 'pre_paid'
  WHEN confirmation_status = 'not_booked' THEN 'n_a'
  ELSE 'pending'
END;

-- Add new constraints for dining
ALTER TABLE dining ADD CONSTRAINT dining_payment_status_check 
  CHECK (payment_status IS NULL OR payment_status IN ('pending', 'pre_paid', 'paid_on_site', 'n_a'));

ALTER TABLE dining DROP CONSTRAINT IF EXISTS dining_paid_by_check;
ALTER TABLE dining ADD CONSTRAINT dining_paid_by_check 
  CHECK (paid_by IS NULL OR paid_by IN ('desert_paths', 'client'));

-- ===== ACTIVITIES TABLE =====

-- Drop existing payment_status constraint
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_payment_status_check;

-- Add paid_by field (if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'paid_by'
  ) THEN
    ALTER TABLE activities ADD COLUMN paid_by text;
  END IF;
END $$;

-- Migrate existing activities payment_status values to new format
UPDATE activities 
SET payment_status = CASE
  WHEN payment_status IN ('prepaid') THEN 'pre_paid'
  WHEN payment_status IN ('pay_onsite') THEN 'paid_on_site'
  WHEN payment_status IN ('pending') THEN 'pending'
  WHEN payment_status IN ('n/a', 'N/A') THEN 'n_a'
  ELSE 'pending'
END;

-- Add new constraints for activities
ALTER TABLE activities ADD CONSTRAINT activities_payment_status_check 
  CHECK (payment_status IS NULL OR payment_status IN ('pending', 'pre_paid', 'paid_on_site', 'n_a'));

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_paid_by_check;
ALTER TABLE activities ADD CONSTRAINT activities_paid_by_check 
  CHECK (paid_by IS NULL OR paid_by IN ('desert_paths', 'client'));

-- Drop old dining fields that are no longer needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'payment_arrangement'
  ) THEN
    ALTER TABLE dining DROP CONSTRAINT IF EXISTS dining_payment_arrangement_check;
    ALTER TABLE dining DROP COLUMN payment_arrangement;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'included_in_package'
  ) THEN
    ALTER TABLE dining DROP COLUMN included_in_package;
  END IF;
END $$;
