/*
  # Fix Activity Booking Fees Foreign Key

  ## Problem
  The `activity_booking_fees` table had a foreign key constraint that incorrectly
  referenced `itinerary_entries(id)` instead of `activities(id)`.

  ## Changes
  1. Drop the incorrect foreign key constraint
  2. Add the correct foreign key constraint to reference `activities(id)`

  ## Impact
  - Booking fees will now correctly reference the activities table
  - This fixes the error: "violates foreign key constraint activity_booking_fees_activity_id_fkey"
*/

-- Drop the incorrect foreign key constraint
ALTER TABLE activity_booking_fees
  DROP CONSTRAINT IF EXISTS activity_booking_fees_activity_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE activity_booking_fees
  ADD CONSTRAINT activity_booking_fees_activity_id_fkey
  FOREIGN KEY (activity_id)
  REFERENCES activities(id)
  ON DELETE CASCADE;
