/*
  # Make Accommodation Fields Optional

  1. Changes
    - Make hotel_name nullable (optional)
    - Make location_address nullable (optional)
    
  2. Reason
    - Allow flexible data entry for accommodations
    - Reduce friction when saving partial information
    - Hotel details don't always require all fields upfront
*/

ALTER TABLE accommodations
ALTER COLUMN hotel_name DROP NOT NULL;

ALTER TABLE accommodations
ALTER COLUMN location_address DROP NOT NULL;

-- Add default values for better handling
ALTER TABLE accommodations
ALTER COLUMN hotel_name SET DEFAULT '';

ALTER TABLE accommodations
ALTER COLUMN location_address SET DEFAULT '';
