/*
  # Set Default Creator for Existing Journeys

  1. Changes
    - Update all journeys with NULL created_by to admin user
    - Sets created_by to info@desertpaths.co (Desert Paths Admin)
    - Temporarily disable trigger to avoid logging this bulk update
    
  2. Notes
    - Only affects journeys where created_by is currently NULL
    - Preserves existing created_by values
*/

-- Temporarily disable the trigger
ALTER TABLE journeys DISABLE TRIGGER trip_updates_trigger;

-- Update all journeys with NULL created_by to the admin user
UPDATE journeys
SET created_by = 'b66886a7-51a4-48ec-86d6-31a107e113f1'
WHERE created_by IS NULL;

-- Re-enable the trigger
ALTER TABLE journeys ENABLE TRIGGER trip_updates_trigger;
