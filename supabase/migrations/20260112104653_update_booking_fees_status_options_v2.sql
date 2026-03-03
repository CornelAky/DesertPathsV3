/*
  # Update booking fee status options

  1. Changes
    - Update status check constraints to match UI options
    - Old values: booked, pending, not_required
    - New values: pending, confirmed, paid, cancelled, n_a
    - Update any existing data to map old values to new values
  
  2. Affected Tables
    - activity_booking_fees
    - accommodation_booking_fees
    - dining_booking_fees
    - transportation_booking_fees
*/

-- Drop all status check constraints first
ALTER TABLE activity_booking_fees 
  DROP CONSTRAINT IF EXISTS activity_booking_fees_status_check;

ALTER TABLE accommodation_booking_fees 
  DROP CONSTRAINT IF EXISTS accommodation_booking_fees_status_check;

ALTER TABLE dining_booking_fees 
  DROP CONSTRAINT IF EXISTS dining_booking_fees_status_check;

ALTER TABLE transportation_booking_fees 
  DROP CONSTRAINT IF EXISTS transportation_booking_fees_status_check;

-- Update existing data to new status values
UPDATE activity_booking_fees 
SET status = CASE 
  WHEN status = 'booked' THEN 'confirmed'
  WHEN status = 'not_required' THEN 'n_a'
  ELSE status
END;

UPDATE accommodation_booking_fees 
SET status = CASE 
  WHEN status = 'booked' THEN 'confirmed'
  WHEN status = 'not_required' THEN 'n_a'
  ELSE status
END;

UPDATE dining_booking_fees 
SET status = CASE 
  WHEN status = 'booked' THEN 'confirmed'
  WHEN status = 'not_required' THEN 'n_a'
  ELSE status
END;

UPDATE transportation_booking_fees 
SET status = CASE 
  WHEN status = 'booked' THEN 'confirmed'
  WHEN status = 'not_required' THEN 'n_a'
  ELSE status
END;

-- Recreate the check constraints with new values
ALTER TABLE activity_booking_fees 
  ADD CONSTRAINT activity_booking_fees_status_check 
  CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'n_a'));

ALTER TABLE accommodation_booking_fees 
  ADD CONSTRAINT accommodation_booking_fees_status_check 
  CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'n_a'));

ALTER TABLE dining_booking_fees 
  ADD CONSTRAINT dining_booking_fees_status_check 
  CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'n_a'));

ALTER TABLE transportation_booking_fees 
  ADD CONSTRAINT transportation_booking_fees_status_check 
  CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'n_a'));
