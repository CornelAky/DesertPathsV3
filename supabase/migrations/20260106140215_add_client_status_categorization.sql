/*
  # Add Client Status Categorization

  1. Changes
    - Add `client_status` column to master_clients table
    - Support three status types: Individual Client, Business - Retail, Business - Partner
    - Set default to 'individual_client'
  
  2. Security
    - No RLS changes needed as table already has policies
*/

-- Add client_status column to master_clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_clients' AND column_name = 'client_status'
  ) THEN
    ALTER TABLE master_clients 
    ADD COLUMN client_status text DEFAULT 'individual_client';
  END IF;
END $$;

-- Add check constraint for valid statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'master_clients_client_status_check'
  ) THEN
    ALTER TABLE master_clients
    ADD CONSTRAINT master_clients_client_status_check
    CHECK (client_status IN ('individual_client', 'business_retail', 'business_partner'));
  END IF;
END $$;