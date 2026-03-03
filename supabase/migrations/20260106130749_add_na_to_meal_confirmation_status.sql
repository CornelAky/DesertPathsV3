/*
  # Add N/A Option to Meal Confirmation Status

  1. Changes
    - Update `dining` table `confirmation_status` column to allow 'n/a' as a value
    - Add 'n/a' as a valid option for meal confirmation status

  2. Notes
    - This allows meals to be marked as not applicable (e.g., when meal plans are flexible or optional)
    - Existing data is not affected
*/

-- Drop the existing check constraint
ALTER TABLE dining DROP CONSTRAINT IF EXISTS dining_confirmation_status_check;

-- Add the new check constraint with 'n/a' option
ALTER TABLE dining ADD CONSTRAINT dining_confirmation_status_check
  CHECK (confirmation_status IN ('confirmed', 'not_booked', 'pending', 'n/a'));
