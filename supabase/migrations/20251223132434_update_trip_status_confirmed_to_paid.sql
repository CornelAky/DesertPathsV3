/*
  # Update Trip Status: Replace 'Confirmed' with 'Paid'

  ## Overview
  Updates the trip status enum to replace 'confirmed' with 'paid' to better 
  reflect the payment status of trips.

  ## Changes to Tables
  - `trips`
    - Updates CHECK constraint on `status` field
    - Changes allowed values from ('planning', 'confirmed', 'in_progress', 'completed')
    - To ('planning', 'paid', 'in_progress', 'completed')
    - Migrates existing 'confirmed' statuses to 'paid'

  ## Important Notes
  1. All existing trips with status 'confirmed' will be updated to 'paid'
  2. The constraint is updated to allow only valid status values
  3. This change provides clearer terminology for trip payment status
*/

-- First, update any existing trips with 'confirmed' status to 'paid'
UPDATE trips 
SET status = 'paid' 
WHERE status = 'confirmed';

-- Drop the existing CHECK constraint on status
ALTER TABLE trips 
DROP CONSTRAINT IF EXISTS trips_status_check;

-- Add the new CHECK constraint with 'paid' instead of 'confirmed'
ALTER TABLE trips 
ADD CONSTRAINT trips_status_check 
CHECK (status IN ('planning', 'paid', 'in_progress', 'completed'));
