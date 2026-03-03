/*
  # Add Soft Delete and Enhanced Status Management

  ## Overview
  This migration implements a soft delete system for users and enhances status management capabilities.

  ## Changes

  ### 1. Schema Modifications
  - Add `deleted_at` column to users table for soft delete tracking
  - Update status CHECK constraint to include 'inactive' and 'deleted' statuses
  - Add `deleted_by` column to track which admin deleted the user
  - Add index on deleted_at for efficient filtering

  ### 2. Security Updates
  - Update RLS policies to prevent deleted/inactive users from accessing the system
  - Allow admins to view deleted users for audit purposes
  - Prevent deleted users from logging in or performing any actions

  ### 3. Status Flow
  - Users can transition between: pending → active → inactive → deleted
  - Users can also be: pending → rejected
  - Deleted users are preserved for historical data and audit trails
  - All relationships and data remain intact

  ## Benefits
  - No data loss when "deleting" users
  - Audit trail is preserved
  - Attribution for trips and documents remains intact
  - Can restore users if needed by clearing deleted_at
  - Historical data remains queryable
*/

-- Add deleted_at column to users table (directly)
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add deleted_by column to track who deleted the user (directly)
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id);

-- Update status CHECK constraint to include 'inactive' and 'deleted' statuses
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check 
  CHECK (status IN ('pending', 'active', 'rejected', 'inactive', 'deleted'));

-- Create index for efficient filtering of deleted users
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create index for combined status and deleted filtering
CREATE INDEX IF NOT EXISTS idx_users_status_deleted ON users(status, deleted_at);

-- Update RLS policies to prevent deleted/inactive users from accessing the system

-- Drop and recreate the user read policy to allow admins to see deleted users
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.status = 'active'
      AND admin_user.deleted_at IS NULL
    )
  );

-- Update customer policies to check for deleted users
DROP POLICY IF EXISTS "Admins can manage all customers" ON customers;
CREATE POLICY "Admins can manage all customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
      AND users.deleted_at IS NULL
    )
  );

-- Update journeys (trips) policies to check for deleted users
DROP POLICY IF EXISTS "Admins can manage all journeys" ON journeys;
CREATE POLICY "Admins can manage all journeys"
  ON journeys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
      AND users.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Guides can view shared journeys" ON journeys;
CREATE POLICY "Guides can view shared journeys"
  ON journeys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.status = 'active'
      AND users.deleted_at IS NULL
    )
    AND (
      EXISTS (
        SELECT 1 FROM journey_shares
        WHERE journey_shares.journey_id = journeys.id
        AND journey_shares.shared_with = auth.uid()
        AND journey_shares.is_active = true
        AND journey_shares.revoked_at IS NULL
      )
      OR is_users_guide_copy(journeys.id)
    )
  );

-- Update user management policies to allow admins to soft delete users
DROP POLICY IF EXISTS "Admins can update all users" ON users;
CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.status = 'active'
      AND admin_user.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.status = 'active'
      AND admin_user.deleted_at IS NULL
    )
  );

-- Create a helper function to check if a user is deleted or inactive
CREATE OR REPLACE FUNCTION is_user_active(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND status = 'active'
    AND deleted_at IS NULL
  );
$$;

-- Add comments explaining soft delete approach
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp. When set, user cannot log in or perform actions but data is preserved for historical/audit purposes';
COMMENT ON COLUMN users.deleted_by IS 'Admin who soft-deleted this user';
COMMENT ON COLUMN users.status IS 'User status: pending (awaiting approval), active (approved and can access), rejected (denied access), inactive (temporarily disabled), deleted (soft-deleted but preserved)';
