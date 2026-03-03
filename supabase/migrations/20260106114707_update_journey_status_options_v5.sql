/*
  # Update Journey Status Options v5

  ## Overview
  Update journey status to include all required status options.

  ## Changes
  1. Temporarily disable user triggers
  2. Drop old constraint
  3. Update existing status values
  4. Add new constraint with all status options
  5. Re-enable triggers
  
  ## Security
  - No RLS changes needed (existing policies cover status column)
*/

-- Temporarily disable user triggers on the table (not system triggers)
ALTER TABLE journeys DISABLE TRIGGER USER;

-- Drop old constraint first
ALTER TABLE journeys DROP CONSTRAINT IF EXISTS journeys_status_check;
ALTER TABLE journeys DROP CONSTRAINT IF EXISTS trips_status_check;

-- Update existing status values to new format (now without constraint)
UPDATE journeys SET status = 'live' WHERE status = 'in_progress';
UPDATE journeys SET status = 'fully_paid' WHERE status = 'paid';

-- Add new constraint with all status options
ALTER TABLE journeys ADD CONSTRAINT journeys_status_check 
CHECK (status IN ('draft', 'planning', 'confirmed', 'partially_paid', 'fully_paid', 'live', 'completed', 'canceled'));

-- Update default value
ALTER TABLE journeys ALTER COLUMN status SET DEFAULT 'draft';

-- Add comment for documentation
COMMENT ON COLUMN journeys.status IS 'Journey status: draft, planning, confirmed, partially_paid, fully_paid, live, completed, canceled';

-- Re-enable user triggers
ALTER TABLE journeys ENABLE TRIGGER USER;
