/*
  # Create Staff Management System
  
  1. New Tables
    - `trip_staff`
      - Core staff information and assignment to trips
      - Status tracking (confirmed, pending, cancelled, replacement_needed)
      - Availability tracking
      - Payment tracking
      - Document/requirement tracking
    
    - `trip_staff_day_assignments`
      - Assigns staff to specific days
    
    - `trip_staff_activity_assignments`
      - Assigns staff to specific activities
  
  2. Enums
    - staff_role_type: Guide, Driver, Coordinator, Photographer, etc.
    - staff_type: Internal, External
    - staff_status_type: Confirmed, Pending, Cancelled, Replacement Needed
    - staff_availability_type: Available, Partially Available, Not Available
    - staff_payment_status_type: Not Paid, Partially Paid, Fully Paid
  
  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users with proper access control
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE staff_role_type AS ENUM (
    'guide',
    'driver',
    'coordinator',
    'photographer',
    'translator',
    'porter',
    'chef',
    'medic',
    'security',
    'assistant',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE staff_type AS ENUM ('internal', 'external');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE staff_status_type AS ENUM (
    'confirmed',
    'pending',
    'cancelled',
    'replacement_needed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE staff_availability_type AS ENUM (
    'available',
    'partially_available',
    'not_available'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE staff_payment_status_type AS ENUM (
    'not_paid',
    'partially_paid',
    'fully_paid'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create trip_staff table
CREATE TABLE IF NOT EXISTS trip_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  role staff_role_type NOT NULL,
  role_custom text,
  staff_type staff_type DEFAULT 'internal',
  email text,
  phone text,
  emergency_contact text,
  status staff_status_type DEFAULT 'pending',
  availability staff_availability_type DEFAULT 'available',
  availability_notes text DEFAULT '',
  payment_status staff_payment_status_type DEFAULT 'not_paid',
  payment_method text,
  payment_amount numeric(10, 2),
  payment_date date,
  payment_notes text DEFAULT '',
  id_verified boolean DEFAULT false,
  contract_signed boolean DEFAULT false,
  uniform_issued boolean DEFAULT false,
  badge_granted boolean DEFAULT false,
  documents_notes text DEFAULT '',
  internal_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trip_staff_day_assignments table
CREATE TABLE IF NOT EXISTS trip_staff_day_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES trip_staff(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, day_id)
);

-- Create trip_staff_activity_assignments table
CREATE TABLE IF NOT EXISTS trip_staff_activity_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES trip_staff(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, activity_id)
);

-- Enable RLS
ALTER TABLE trip_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_staff_day_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_staff_activity_assignments ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has edit permission
CREATE OR REPLACE FUNCTION has_staff_edit_permission(target_trip_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM trip_shares 
      WHERE trip_id = target_trip_id 
      AND shared_with = auth.uid()
      AND permission_level IN ('edit', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM trips
      WHERE id = target_trip_id
      AND created_by = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for trip_staff
CREATE POLICY "Users can view staff for trips they have access to"
  ON trip_staff FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'guide')
    )
    OR EXISTS (
      SELECT 1 FROM trip_shares 
      WHERE trip_id = trip_staff.trip_id 
      AND shared_with = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM trips
      WHERE id = trip_staff.trip_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert staff if they have edit permission"
  ON trip_staff FOR INSERT
  TO authenticated
  WITH CHECK (has_staff_edit_permission(trip_id));

CREATE POLICY "Users can update staff if they have edit permission"
  ON trip_staff FOR UPDATE
  TO authenticated
  USING (has_staff_edit_permission(trip_id))
  WITH CHECK (has_staff_edit_permission(trip_id));

CREATE POLICY "Users can delete staff if they have edit permission"
  ON trip_staff FOR DELETE
  TO authenticated
  USING (has_staff_edit_permission(trip_id));

-- Policies for trip_staff_day_assignments
CREATE POLICY "Users can view day assignments for trips they have access to"
  ON trip_staff_day_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_staff ts
      JOIN trips t ON ts.trip_id = t.id
      WHERE ts.id = trip_staff_day_assignments.staff_id
      AND (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'guide'))
        OR EXISTS (SELECT 1 FROM trip_shares WHERE trip_id = t.id AND shared_with = auth.uid())
        OR t.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert day assignments if they have edit permission"
  ON trip_staff_day_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_staff ts
      JOIN trips t ON ts.trip_id = t.id
      WHERE ts.id = staff_id
      AND has_staff_edit_permission(t.id)
    )
  );

CREATE POLICY "Users can update day assignments if they have edit permission"
  ON trip_staff_day_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_staff ts
      JOIN trips t ON ts.trip_id = t.id
      WHERE ts.id = staff_id
      AND has_staff_edit_permission(t.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_staff ts
      JOIN trips t ON ts.trip_id = t.id
      WHERE ts.id = staff_id
      AND has_staff_edit_permission(t.id)
    )
  );

CREATE POLICY "Users can delete day assignments if they have edit permission"
  ON trip_staff_day_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_staff ts
      JOIN trips t ON ts.trip_id = t.id
      WHERE ts.id = staff_id
      AND has_staff_edit_permission(t.id)
    )
  );

-- Policies for trip_staff_activity_assignments
CREATE POLICY "Users can view activity assignments for trips they have access to"
  ON trip_staff_activity_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_staff ts
      JOIN trips t ON ts.trip_id = t.id
      WHERE ts.id = trip_staff_activity_assignments.staff_id
      AND (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'guide'))
        OR EXISTS (SELECT 1 FROM trip_shares WHERE trip_id = t.id AND shared_with = auth.uid())
        OR t.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert activity assignments if they have edit permission"
  ON trip_staff_activity_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_staff ts
      JOIN trips t ON ts.trip_id = t.id
      WHERE ts.id = staff_id
      AND has_staff_edit_permission(t.id)
    )
  );

CREATE POLICY "Users can update activity assignments if they have edit permission"
  ON trip_staff_activity_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_staff ts
      JOIN trips t ON ts.trip_id = t.id
      WHERE ts.id = staff_id
      AND has_staff_edit_permission(t.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_staff ts
      JOIN trips t ON ts.trip_id = t.id
      WHERE ts.id = staff_id
      AND has_staff_edit_permission(t.id)
    )
  );

CREATE POLICY "Users can delete activity assignments if they have edit permission"
  ON trip_staff_activity_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_staff ts
      JOIN trips t ON ts.trip_id = t.id
      WHERE ts.id = staff_id
      AND has_staff_edit_permission(t.id)
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_staff_trip_id ON trip_staff(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_staff_status ON trip_staff(status);
CREATE INDEX IF NOT EXISTS idx_trip_staff_role ON trip_staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_day_assignments_staff_id ON trip_staff_day_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_day_assignments_day_id ON trip_staff_day_assignments(day_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_assignments_staff_id ON trip_staff_activity_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_assignments_activity_id ON trip_staff_activity_assignments(activity_id);