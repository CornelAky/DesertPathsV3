/*
  # Update Client Status Values

  1. Changes
    - Drop old check constraint
    - Add new check constraint with updated values: retail, partner
    - Update existing data to new format
  
  2. Security
    - No RLS changes needed
*/

-- Drop old constraint
ALTER TABLE master_clients DROP CONSTRAINT IF EXISTS master_clients_client_status_check;

-- Update existing values
UPDATE master_clients 
SET client_status = 'retail' 
WHERE client_status = 'business_retail';

UPDATE master_clients 
SET client_status = 'partner' 
WHERE client_status = 'business_partner';

UPDATE master_clients 
SET client_status = NULL 
WHERE client_status = 'individual_client';

-- Add new constraint with updated values
ALTER TABLE master_clients
ADD CONSTRAINT master_clients_client_status_check
CHECK (client_status IN ('retail', 'partner') OR client_status IS NULL);