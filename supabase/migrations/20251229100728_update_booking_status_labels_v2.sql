/*
  # Update Booking Status Labels
  
  1. Changes
    - Update internal_booking_status enum to use new labels
    - Change 'not_confirmed' → 'unbooked'
    - Change 'confirmed' → 'booked'
    - Remove 'partially_paid' and 'fully_paid'
    - Add 'n/a' status for items that don't require booking
  
  2. Status Values (NEW)
    - booked: Item is booked/confirmed
    - unbooked: Item is not yet booked
    - n/a: Item does not require booking
  
  3. Data Migration
    - Migrate all existing status values to new format
    - 'not_confirmed' → 'unbooked'
    - 'confirmed', 'partially_paid', 'fully_paid' → 'booked'
*/

-- Step 1: Create temporary columns with text type to hold status during migration
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS temp_booking_status text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS temp_booking_status text;
ALTER TABLE dining ADD COLUMN IF NOT EXISTS temp_booking_status text;

-- Step 2: Copy and transform existing status values to temporary columns
UPDATE accommodations 
SET temp_booking_status = CASE 
  WHEN internal_booking_status IN ('confirmed', 'partially_paid', 'fully_paid') THEN 'booked'
  WHEN internal_booking_status = 'not_confirmed' THEN 'unbooked'
  ELSE 'unbooked'
END;

UPDATE activities 
SET temp_booking_status = CASE 
  WHEN internal_booking_status IN ('confirmed', 'partially_paid', 'fully_paid') THEN 'booked'
  WHEN internal_booking_status = 'not_confirmed' THEN 'unbooked'
  ELSE 'unbooked'
END;

UPDATE dining 
SET temp_booking_status = CASE 
  WHEN internal_booking_status IN ('confirmed', 'partially_paid', 'fully_paid') THEN 'booked'
  WHEN internal_booking_status = 'not_confirmed' THEN 'unbooked'
  ELSE 'unbooked'
END;

-- Step 3: Drop the old columns
ALTER TABLE accommodations DROP COLUMN IF EXISTS internal_booking_status;
ALTER TABLE activities DROP COLUMN IF EXISTS internal_booking_status;
ALTER TABLE dining DROP COLUMN IF EXISTS internal_booking_status;

-- Step 4: Drop and recreate the enum type with new values
DROP TYPE IF EXISTS internal_booking_status_type CASCADE;
CREATE TYPE internal_booking_status_type AS ENUM (
  'booked',
  'unbooked',
  'n/a'
);

-- Step 5: Add back the columns with the new enum type
ALTER TABLE accommodations 
ADD COLUMN internal_booking_status internal_booking_status_type DEFAULT 'unbooked';

ALTER TABLE activities 
ADD COLUMN internal_booking_status internal_booking_status_type DEFAULT 'unbooked';

ALTER TABLE dining 
ADD COLUMN internal_booking_status internal_booking_status_type DEFAULT 'unbooked';

-- Step 6: Copy data from temporary columns to new enum columns
UPDATE accommodations 
SET internal_booking_status = temp_booking_status::internal_booking_status_type;

UPDATE activities 
SET internal_booking_status = temp_booking_status::internal_booking_status_type;

UPDATE dining 
SET internal_booking_status = temp_booking_status::internal_booking_status_type;

-- Step 7: Drop temporary columns
ALTER TABLE accommodations DROP COLUMN temp_booking_status;
ALTER TABLE activities DROP COLUMN temp_booking_status;
ALTER TABLE dining DROP COLUMN temp_booking_status;