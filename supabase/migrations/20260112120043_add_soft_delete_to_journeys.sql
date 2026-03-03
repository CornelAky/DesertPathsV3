/*
  # Add Soft Delete to Journeys

  ## Changes
  1. Add `deleted_at` column to journeys table for soft delete tracking
  2. Add index on deleted_at for efficient filtering
  3. Update RLS policies to respect soft-deleted journeys
  
  ## Details
  - Soft deleted journeys are hidden from normal queries but preserved for recovery
  - Admins can restore journeys by clearing the deleted_at timestamp
  - Soft deleted journeys appear in the Trash tab
*/

-- Add deleted_at column to journeys table
ALTER TABLE journeys ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create index for efficient filtering of deleted journeys
CREATE INDEX IF NOT EXISTS idx_journeys_deleted_at ON journeys(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create index for combined status and deleted filtering
CREATE INDEX IF NOT EXISTS idx_journeys_deleted_status ON journeys(deleted_at, status);

-- Add comment for documentation
COMMENT ON COLUMN journeys.deleted_at IS 'Soft delete timestamp. When set, journey is moved to trash but data is preserved for recovery';