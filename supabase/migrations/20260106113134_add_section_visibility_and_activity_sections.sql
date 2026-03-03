/*
  # Add Section Visibility and New Activity Sections

  ## Overview
  1. Add section visibility toggles to itinerary_days to hide/show sections
  2. Update activities meal_type to support new sections:
     - early_morning (before breakfast)
     - evening (after dinner)
     - night (before accommodation)
  
  ## Changes
  1. Add section visibility columns to itinerary_days
  2. Update activities table to allow more section types
  3. Update dining table meal types
  
  ## Security
  - No RLS changes needed (existing policies cover new columns)
*/

-- Add section visibility toggles to itinerary_days
ALTER TABLE itinerary_days
ADD COLUMN IF NOT EXISTS show_transportation boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_breakfast boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_morning_activity boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_lunch boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_afternoon_activity boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_dinner boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_accommodation boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_early_morning_activity boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_evening_activity boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_night_activity boolean DEFAULT true;

-- Comments for documentation
COMMENT ON COLUMN itinerary_days.show_transportation IS 'Whether to show transportation section';
COMMENT ON COLUMN itinerary_days.show_breakfast IS 'Whether to show breakfast section';
COMMENT ON COLUMN itinerary_days.show_morning_activity IS 'Whether to show morning activity section';
COMMENT ON COLUMN itinerary_days.show_lunch IS 'Whether to show lunch section';
COMMENT ON COLUMN itinerary_days.show_afternoon_activity IS 'Whether to show afternoon activity section';
COMMENT ON COLUMN itinerary_days.show_dinner IS 'Whether to show dinner section';
COMMENT ON COLUMN itinerary_days.show_accommodation IS 'Whether to show accommodation section';
COMMENT ON COLUMN itinerary_days.show_early_morning_activity IS 'Whether to show early morning activity section';
COMMENT ON COLUMN itinerary_days.show_evening_activity IS 'Whether to show evening activity section';
COMMENT ON COLUMN itinerary_days.show_night_activity IS 'Whether to show night activity section';
