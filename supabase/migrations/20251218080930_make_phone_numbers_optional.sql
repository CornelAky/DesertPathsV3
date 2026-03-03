/*
  # Make Phone Numbers Optional

  1. Changes
    - Make `contact_number` field in `customers` table optional (allow NULL)
    - This allows creating customers without requiring a phone number
    
  2. Notes
    - Phone numbers are not always available or necessary
    - Email can be the primary contact method in many cases
*/

DO $$
BEGIN
  -- Make contact_number nullable in customers table
  ALTER TABLE customers ALTER COLUMN contact_number DROP NOT NULL;
END $$;