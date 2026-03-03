/*
  # Make Time and Name Fields Optional for Flexible Saving

  1. Changes
    - Make activities.activity_time nullable (optional)
    - Make activities.activity_name nullable (optional)
    - Make activities.location nullable (optional)
    - Make dining.reservation_time nullable (optional)
    - Make dining.restaurant_name nullable (optional)
    - Make dining.location_address nullable (optional)
    
  2. Reason
    - Support real planning workflows where details are decided later
    - Allow saving draft entries without complete information
    - Reduce friction during itinerary creation
    - No constraints should prevent saving incomplete entries
    
  3. Notes
    - All fields now have sensible defaults
    - Admins can save partial information and update later
    - Supports iterative planning approach
*/

-- Activities table: Make required fields optional
ALTER TABLE activities
ALTER COLUMN activity_time DROP NOT NULL;

ALTER TABLE activities
ALTER COLUMN activity_name DROP NOT NULL;

ALTER TABLE activities
ALTER COLUMN location DROP NOT NULL;

-- Add default values for better handling
ALTER TABLE activities
ALTER COLUMN activity_time SET DEFAULT NULL;

ALTER TABLE activities
ALTER COLUMN activity_name SET DEFAULT '';

ALTER TABLE activities
ALTER COLUMN location SET DEFAULT '';

-- Dining table: Make required fields optional
ALTER TABLE dining
ALTER COLUMN reservation_time DROP NOT NULL;

ALTER TABLE dining
ALTER COLUMN restaurant_name DROP NOT NULL;

ALTER TABLE dining
ALTER COLUMN location_address DROP NOT NULL;

-- Add default values for better handling
ALTER TABLE dining
ALTER COLUMN reservation_time SET DEFAULT NULL;

ALTER TABLE dining
ALTER COLUMN restaurant_name SET DEFAULT '';

ALTER TABLE dining
ALTER COLUMN location_address SET DEFAULT '';

-- Meal type should stay required but update default
ALTER TABLE dining
ALTER COLUMN meal_type SET DEFAULT 'lunch';
