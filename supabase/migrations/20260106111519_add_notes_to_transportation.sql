/*
  # Add Notes Field to Transportation

  ## Overview
  Add a notes field to the transportation table to allow users to specify
  where and how the means of transportation will be used during the day.

  ## Changes
  1. Add `notes` column to transportation table
  2. Column is text type with default empty string
  
  ## Security
  - No RLS changes needed (existing policies cover new column)
*/

-- Add notes column to transportation table
ALTER TABLE transportation 
ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- Create comment for documentation
COMMENT ON COLUMN transportation.notes IS 'Notes describing where and how this transportation will be used';
