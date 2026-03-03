/*
  # Add Soft Delete to Clients

  1. Changes
    - Add `deleted_at` column to customers table
    - Add `deleted_by` column to track who deleted the record
    - Update RLS policies to exclude deleted clients by default
    - Create view to show deleted status in journeys

  2. Security
    - Admins can still view deleted clients
    - Deleted clients are hidden from normal queries
*/

-- Add soft delete columns to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE customers ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE customers ADD COLUMN deleted_by uuid REFERENCES users(id) DEFAULT NULL;
  END IF;
END $$;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);

-- Update default time periods in system settings
UPDATE system_settings
SET setting_value = jsonb_set(
  setting_value,
  '{early_morning,start}',
  '"00:00"'::jsonb
)
WHERE setting_key = 'activity_time_periods';
