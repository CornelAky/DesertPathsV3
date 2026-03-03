/*
  # Add Guest and Staff Count to Activity Booking Fees

  ## Overview
  Enhances the activity booking fees system to track the number of guests and staff
  each fee applies to, enabling more granular cost tracking (e.g., "10 SAR for 16 guests").

  ## Changes
  1. Add Fields to `activity_booking_fees` table:
    - `guest_count` (integer) - Number of guests this fee applies to (nullable, default 1)
    - `staff_count` (integer) - Number of staff this fee applies to (nullable, default 0)

  ## Important Notes
  - These fields are optional and default to sensible values
  - When `applies_to` = 'guest', typically `guest_count` > 0 and `staff_count` = 0
  - When `applies_to` = 'guide', typically `staff_count` > 0 and `guest_count` = 0
  - Both can be set for mixed fees
  - Existing rows will get default values (1 guest, 0 staff)
*/

-- Add guest_count and staff_count columns to activity_booking_fees
ALTER TABLE activity_booking_fees
  ADD COLUMN IF NOT EXISTS guest_count integer DEFAULT 1 CHECK (guest_count >= 0),
  ADD COLUMN IF NOT EXISTS staff_count integer DEFAULT 0 CHECK (staff_count >= 0);

-- Update existing rows to have sensible defaults based on applies_to
UPDATE activity_booking_fees
SET guest_count = CASE
    WHEN applies_to = 'guest' THEN 1
    ELSE 0
  END,
  staff_count = CASE
    WHEN applies_to = 'guide' THEN 1
    ELSE 0
  END
WHERE guest_count IS NULL OR staff_count IS NULL;
