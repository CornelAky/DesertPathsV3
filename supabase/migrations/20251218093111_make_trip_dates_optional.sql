/*
  # Make trip start and end dates optional

  1. Changes
    - Alter `trips` table to make `start_date` and `end_date` columns nullable
    - This allows creating trips without complete date information
    - Users can manually assign dates after import

  2. Rationale
    - Supports flexible trip creation workflow
    - Removes validation barriers during import process
    - Enables draft/planning mode for trips
*/

ALTER TABLE trips 
ALTER COLUMN start_date DROP NOT NULL,
ALTER COLUMN end_date DROP NOT NULL;
