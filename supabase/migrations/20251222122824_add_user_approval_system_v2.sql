/*
  # Add User Approval System

  ## Overview
  This migration adds an approval system for new user registrations. Users must be approved by an admin before they can access the application.

  ## Changes

  ### 1. Schema Modifications
  - Add `status` column to users table with values: 'pending', 'active', 'rejected'
  - Add `approved_by` column to track which admin approved the user
  - Add `approved_at` column to track when approval happened
  - Add `rejection_reason` column for rejected users

  ### 2. Security
  - Update RLS policies to ensure only 'active' users can perform actions
  - Prevent pending/rejected users from accessing application data
  - Allow admins to view and manage all user statuses

  ### 3. Indexes
  - Add index on status column for efficient filtering
*/

-- Add status column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected'));
  END IF;
END $$;

-- Add approved_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE users ADD COLUMN approved_by uuid REFERENCES users(id);
  END IF;
END $$;

-- Add approved_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE users ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Add rejection_reason column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE users ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Set existing users to 'active' status (backward compatibility)
UPDATE users SET status = 'active' WHERE status IS NULL OR status = 'pending';

-- Create index for efficient status filtering
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Allow new user self-registration
DROP POLICY IF EXISTS "Allow user registration" ON users;
CREATE POLICY "Allow user registration"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update existing policies to check for active status

-- Drop and recreate customers policy with status check
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
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

-- Drop and recreate trips policies with status check
DROP POLICY IF EXISTS "Admins can manage all trips" ON trips;
CREATE POLICY "Admins can manage all trips"
  ON trips FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Guides can view assigned trips" ON trips;
CREATE POLICY "Guides can view assigned trips"
  ON trips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.status = 'active'
    )
    AND (
      EXISTS (
        SELECT 1 FROM trip_assignments
        WHERE trip_assignments.trip_id = trips.id
        AND trip_assignments.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM trip_shares
        WHERE trip_shares.trip_id = trips.id
        AND trip_shares.shared_with = auth.uid()
        AND trip_shares.is_active = true
        AND trip_shares.revoked_at IS NULL
      )
    )
  );