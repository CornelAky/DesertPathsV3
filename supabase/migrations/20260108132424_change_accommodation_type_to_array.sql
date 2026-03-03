/*
  # Change accommodation_type to support multiple types
  
  1. Changes
    - Change accommodation_type from single enum to text array
    - This allows selecting both 'guest' and 'staff' for the same accommodation
    - Migrate existing data from single value to array
  
  2. Migration Steps
    - Add new column accommodation_types as text array
    - Migrate data from accommodation_type to accommodation_types
    - Drop old accommodation_type column
    - Rename accommodation_types to accommodation_type
*/

-- Add new column as array
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS accommodation_types text[];

-- Migrate existing data
UPDATE accommodations
SET accommodation_types = ARRAY[accommodation_type::text]
WHERE accommodation_type IS NOT NULL AND accommodation_types IS NULL;

-- Set default for rows with null
UPDATE accommodations
SET accommodation_types = ARRAY['guest']
WHERE accommodation_types IS NULL;

-- Drop old column
ALTER TABLE accommodations DROP COLUMN IF EXISTS accommodation_type;

-- Rename new column
ALTER TABLE accommodations RENAME COLUMN accommodation_types TO accommodation_type;

-- Add check constraint to ensure valid values
ALTER TABLE accommodations DROP CONSTRAINT IF EXISTS accommodations_accommodation_type_check;

ALTER TABLE accommodations ADD CONSTRAINT accommodations_accommodation_type_check
  CHECK (
    accommodation_type IS NOT NULL AND
    array_length(accommodation_type, 1) > 0 AND
    accommodation_type <@ ARRAY['guest', 'staff']::text[]
  );

-- Add comment
COMMENT ON COLUMN accommodations.accommodation_type IS 'Array of accommodation types: guest, staff, or both';
