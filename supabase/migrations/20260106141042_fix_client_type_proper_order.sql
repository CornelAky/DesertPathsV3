/*
  # Fix Client Type Constraint - Proper Order

  1. Changes
    - Drop old client_type check constraint first
    - Update existing client_type values to new format
    - Add new constraint allowing 'individual' and 'business'
  
  2. Security
    - No RLS changes needed
*/

-- Drop old constraint FIRST
ALTER TABLE master_clients DROP CONSTRAINT IF EXISTS master_clients_client_type_check;

-- Now update existing values to new format
UPDATE master_clients 
SET client_type = 'business' 
WHERE client_type IN ('corporate', 'travel_agency');

-- Add new constraint with correct values
ALTER TABLE master_clients
ADD CONSTRAINT master_clients_client_type_check
CHECK (client_type IN ('individual', 'business'));