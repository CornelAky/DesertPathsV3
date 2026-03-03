/*
  # Allow 'both' option for booking fee applies_to field

  1. Changes
    - Update check constraints on all booking fee tables to allow 'both' as a valid value for applies_to
    - This enables fees that apply to both guests and staff simultaneously
  
  2. Affected Tables
    - activity_booking_fees
    - accommodation_booking_fees
    - dining_booking_fees
    - transportation_booking_fees
*/

-- Drop and recreate the check constraints to include 'both'
ALTER TABLE activity_booking_fees 
  DROP CONSTRAINT IF EXISTS activity_booking_fees_applies_to_check;

ALTER TABLE activity_booking_fees 
  ADD CONSTRAINT activity_booking_fees_applies_to_check 
  CHECK (applies_to IN ('guest', 'guide', 'both'));

ALTER TABLE accommodation_booking_fees 
  DROP CONSTRAINT IF EXISTS accommodation_booking_fees_applies_to_check;

ALTER TABLE accommodation_booking_fees 
  ADD CONSTRAINT accommodation_booking_fees_applies_to_check 
  CHECK (applies_to IN ('guest', 'guide', 'both'));

ALTER TABLE dining_booking_fees 
  DROP CONSTRAINT IF EXISTS dining_booking_fees_applies_to_check;

ALTER TABLE dining_booking_fees 
  ADD CONSTRAINT dining_booking_fees_applies_to_check 
  CHECK (applies_to IN ('guest', 'guide', 'both'));

ALTER TABLE transportation_booking_fees 
  DROP CONSTRAINT IF EXISTS transportation_booking_fees_applies_to_check;

ALTER TABLE transportation_booking_fees 
  ADD CONSTRAINT transportation_booking_fees_applies_to_check 
  CHECK (applies_to IN ('guest', 'guide', 'both'));
