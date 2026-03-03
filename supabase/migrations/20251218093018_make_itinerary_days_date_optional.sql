/*
  # Make itinerary_days date column optional

  1. Changes
    - Alter `itinerary_days` table to make `date` column nullable
    - This allows importing trips without complete date information
    - Users can manually assign dates after import

  2. Rationale
    - Supports flexible trip creation workflow
    - Removes validation barriers during import process
    - Enables draft/planning mode for trips
*/

ALTER TABLE itinerary_days 
ALTER COLUMN date DROP NOT NULL;
