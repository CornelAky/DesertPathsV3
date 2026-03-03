/*
  # Add 'Draft' Status to Trips

  ## Overview
  Adds 'draft' as a new valid status for trips to support template-based trip creation.

  ## Changes to Tables
  - `trips`
    - Updates CHECK constraint on `status` field
    - Changes allowed values from ('planning', 'paid', 'in_progress', 'completed')
    - To ('draft', 'planning', 'paid', 'in_progress', 'completed')

  ## Important Notes
  1. 'draft' status will be used for trips created from templates
  2. Draft trips can be edited and later changed to 'planning' or other statuses
  3. This provides a clear distinction between trips under initial setup and those being actively planned
*/

-- Drop the existing CHECK constraint on status
ALTER TABLE trips 
DROP CONSTRAINT IF EXISTS trips_status_check;

-- Add the new CHECK constraint with 'draft' as an additional status
ALTER TABLE trips 
ADD CONSTRAINT trips_status_check 
CHECK (status IN ('draft', 'planning', 'paid', 'in_progress', 'completed'));
