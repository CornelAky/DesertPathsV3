/*
  # Add Itinerary Table Enhancements

  ## Summary
  This migration adds features to support comprehensive itinerary table management including change history tracking, admin comments, and enhanced editing capabilities.

  ## Changes Made

  ### 1. New Tables
    - `itinerary_change_log`
      - Tracks all changes made to itinerary entries
      - Records who made the change, what changed, and when
      - Stores old and new values for audit trail
    
    - `itinerary_entry_comments`
      - Stores admin and trip leader comments/notes per itinerary entry
      - Supports visibility flags (admin-only or shared with guides)

  ### 2. Table Modifications
    - `trips` table
      - Add `passenger_count` column for tracking number of passengers
      - Add `client_phone` column for quick access to client contact
    
    - `itinerary_entries` table
      - Add `is_incomplete` column for validation warnings
      - Add `incomplete_reason` column to track what's missing
      - Add `admin_notes` column for admin-specific notes

  ## Security
    - Enable RLS on new tables
    - Add policies for authenticated users to view their data
    - Add policies for admins to manage all records
    - Add policies for guides to view assigned trips only
*/

-- Add new columns to trips table for client info
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'passenger_count'
  ) THEN
    ALTER TABLE trips ADD COLUMN passenger_count integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'client_phone'
  ) THEN
    ALTER TABLE trips ADD COLUMN client_phone text DEFAULT '';
  END IF;
END $$;

-- Add validation and notes columns to itinerary_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_entries' AND column_name = 'is_incomplete'
  ) THEN
    ALTER TABLE itinerary_entries ADD COLUMN is_incomplete boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_entries' AND column_name = 'incomplete_reason'
  ) THEN
    ALTER TABLE itinerary_entries ADD COLUMN incomplete_reason text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_entries' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE itinerary_entries ADD COLUMN admin_notes text DEFAULT '';
  END IF;
END $$;

-- Create change log table
CREATE TABLE IF NOT EXISTS itinerary_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES itinerary_entries(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES users(id),
  change_type text NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted', 'reordered')),
  field_name text,
  old_value text,
  new_value text,
  change_summary text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE itinerary_change_log ENABLE ROW LEVEL SECURITY;

-- Change log policies
CREATE POLICY "Admins can view all change logs"
  ON itinerary_change_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert change logs"
  ON itinerary_change_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Guides can view logs for assigned trips"
  ON itinerary_change_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_entries ie
      JOIN trips t ON ie.trip_id = t.id
      JOIN trip_assignments ta ON ta.trip_id = t.id
      WHERE ie.id = entry_id
      AND ta.user_id = auth.uid()
    )
  );

-- Create comments table
CREATE TABLE IF NOT EXISTS itinerary_entry_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES itinerary_entries(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  comment text NOT NULL,
  visibility text DEFAULT 'all' CHECK (visibility IN ('admin_only', 'all')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE itinerary_entry_comments ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Admins can view all comments"
  ON itinerary_entry_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Guides can view non-admin comments for assigned trips"
  ON itinerary_entry_comments FOR SELECT
  TO authenticated
  USING (
    visibility = 'all'
    AND EXISTS (
      SELECT 1 FROM itinerary_entries ie
      JOIN trips t ON ie.trip_id = t.id
      JOIN trip_assignments ta ON ta.trip_id = t.id
      WHERE ie.id = entry_id
      AND ta.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert comments"
  ON itinerary_entry_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update their own comments"
  ON itinerary_entry_comments FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete their own comments"
  ON itinerary_entry_comments FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_change_log_entry_id ON itinerary_change_log(entry_id);
CREATE INDEX IF NOT EXISTS idx_change_log_created_at ON itinerary_change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_entry_id ON itinerary_entry_comments(entry_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_entries_incomplete ON itinerary_entries(is_incomplete) WHERE is_incomplete = true;