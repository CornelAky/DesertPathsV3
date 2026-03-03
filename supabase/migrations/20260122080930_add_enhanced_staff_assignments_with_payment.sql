/*
  # Enhanced Staff Assignment System with Payment Tracking
  
  1. New Tables
    - `journey_staff_day_assignments` - Enhanced to include payment tracking
      - `id` (uuid, primary key)
      - `staff_id` (uuid, references journey_staff)
      - `day_id` (uuid, references itinerary_days)
      - `activity_id` (uuid, nullable, references activities) - for activity-specific assignments
      - `assignment_type` (enum: 'full_day', 'activity_specific')
      - `payment_status` (enum: 'unpaid', 'paid', 'pending')
      - `payment_amount` (numeric, nullable)
      - `payment_currency` (text, default 'USD')
      - `payment_notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for admins, managers, and journey editors
  
  3. Functions
    - get_staff_roles() - Returns all staff roles from the enum for live sync
*/

-- Drop existing table if it exists and recreate with enhanced structure
DROP TABLE IF EXISTS journey_staff_day_assignments CASCADE;

-- Create assignment type enum
DO $$ BEGIN
  CREATE TYPE staff_assignment_type AS ENUM ('full_day', 'activity_specific');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create payment status enum
DO $$ BEGIN
  CREATE TYPE staff_payment_status AS ENUM ('unpaid', 'paid', 'pending');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enhanced journey_staff_day_assignments table
CREATE TABLE IF NOT EXISTS journey_staff_day_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES journey_staff(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  assignment_type staff_assignment_type NOT NULL DEFAULT 'full_day',
  payment_status staff_payment_status NOT NULL DEFAULT 'unpaid',
  payment_amount numeric(10, 2),
  payment_currency text DEFAULT 'USD',
  payment_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, day_id, activity_id)
);

-- Enable RLS
ALTER TABLE journey_staff_day_assignments ENABLE ROW LEVEL SECURITY;

-- Create function to get all staff roles dynamically
CREATE OR REPLACE FUNCTION get_staff_roles()
RETURNS TABLE (role_value text, role_label text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    enumlabel::text as role_value,
    CASE enumlabel::text
      WHEN 'guide' THEN 'Guide'
      WHEN 'driver' THEN 'Driver'
      WHEN 'coordinator' THEN 'Coordinator'
      WHEN 'photographer' THEN 'Photographer'
      WHEN 'translator' THEN 'Translator'
      WHEN 'heritage_specialist' THEN 'Heritage Specialist'
      WHEN 'biblical_consultant' THEN 'Biblical Consultant'
      WHEN 'chef' THEN 'Chef'
      WHEN 'medic' THEN 'Medic'
      WHEN 'security' THEN 'Security'
      WHEN 'porter' THEN 'Porter'
      WHEN 'assistant' THEN 'Assistant'
      WHEN 'other' THEN 'Other'
      ELSE initcap(replace(enumlabel::text, '_', ' '))
    END as role_label
  FROM pg_enum
  JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
  WHERE pg_type.typname = 'staff_role_type'
  ORDER BY enumlabel::text;
END;
$$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_journey_staff_day_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journey_staff_day_assignments_updated_at ON journey_staff_day_assignments;
CREATE TRIGGER journey_staff_day_assignments_updated_at
  BEFORE UPDATE ON journey_staff_day_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_staff_day_assignments_updated_at();

-- RLS Policies for journey_staff_day_assignments

-- Admins and managers can do everything
CREATE POLICY "Admins and managers can view all staff day assignments"
  ON journey_staff_day_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'manager')
      AND users.status IN ('active', 'approved')
    )
  );

CREATE POLICY "Admins and managers can insert staff day assignments"
  ON journey_staff_day_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'manager')
      AND users.status IN ('active', 'approved')
    )
  );

CREATE POLICY "Admins and managers can update staff day assignments"
  ON journey_staff_day_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'manager')
      AND users.status IN ('active', 'approved')
    )
  );

CREATE POLICY "Admins and managers can delete staff day assignments"
  ON journey_staff_day_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'manager')
      AND users.status IN ('active', 'approved')
    )
  );

-- Journey editors can manage staff assignments for their journeys
CREATE POLICY "Journey editors can view staff day assignments"
  ON journey_staff_day_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      JOIN journeys ON itinerary_days.journey_id = journeys.id
      WHERE itinerary_days.id = journey_staff_day_assignments.day_id
      AND has_edit_permission(journeys.id)
    )
  );

CREATE POLICY "Journey editors can insert staff day assignments"
  ON journey_staff_day_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_days
      JOIN journeys ON itinerary_days.journey_id = journeys.id
      WHERE itinerary_days.id = journey_staff_day_assignments.day_id
      AND has_edit_permission(journeys.id)
    )
  );

CREATE POLICY "Journey editors can update staff day assignments"
  ON journey_staff_day_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      JOIN journeys ON itinerary_days.journey_id = journeys.id
      WHERE itinerary_days.id = journey_staff_day_assignments.day_id
      AND has_edit_permission(journeys.id)
    )
  );

CREATE POLICY "Journey editors can delete staff day assignments"
  ON journey_staff_day_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      JOIN journeys ON itinerary_days.journey_id = journeys.id
      WHERE itinerary_days.id = journey_staff_day_assignments.day_id
      AND has_edit_permission(journeys.id)
    )
  );

-- Staff can view their own assignments (read-only)
CREATE POLICY "Staff can view their own day assignments"
  ON journey_staff_day_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journey_staff
      WHERE journey_staff.id = journey_staff_day_assignments.staff_id
      AND journey_staff.email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_journey_staff_day_assignments_staff_id 
  ON journey_staff_day_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_journey_staff_day_assignments_day_id 
  ON journey_staff_day_assignments(day_id);
CREATE INDEX IF NOT EXISTS idx_journey_staff_day_assignments_activity_id 
  ON journey_staff_day_assignments(activity_id);
CREATE INDEX IF NOT EXISTS idx_journey_staff_day_assignments_payment_status 
  ON journey_staff_day_assignments(payment_status);
