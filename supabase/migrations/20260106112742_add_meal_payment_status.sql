/*
  # Add Meal Payment Status

  ## Overview
  Add a payment_status field to dining table to indicate who pays for the meal
  (Desert Paths, client, or not included).

  ## Changes
  1. Add `payment_status` column to dining table with options:
     - 'desert_paths' - Paid by Desert Paths (default/included)
     - 'paid_by_client' - Paid by client
     - 'not_included' - Not included in package
  
  ## Security
  - No RLS changes needed (existing policies cover new column)
*/

-- Add payment_status column to dining table
ALTER TABLE dining 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'desert_paths' 
CHECK (payment_status IN ('desert_paths', 'paid_by_client', 'not_included'));

-- Create comment for documentation
COMMENT ON COLUMN dining.payment_status IS 'Indicates who pays for the meal: desert_paths (default), paid_by_client, or not_included';
