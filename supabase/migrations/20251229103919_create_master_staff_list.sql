/*
  # Create Master Staff List System
  
  1. New Tables
    - `master_staff`
      - `id` (uuid, primary key)
      - `name` (text, required) - Staff member's full name
      - `role` (text) - Primary role (guide, driver, etc.)
      - `role_custom` (text, nullable) - Custom role description
      - `staff_type` (text) - Employee, contractor, freelancer
      - `email` (text, nullable) - Contact email
      - `phone` (text, nullable) - Contact phone
      - `emergency_contact` (text, nullable) - Emergency contact info
      - `availability` (text) - available, partially_available, not_available
      - `availability_notes` (text) - Notes about availability
      - `payment_method` (text, nullable) - Preferred payment method
      - `id_verified` (boolean) - Whether ID has been verified
      - `contract_signed` (boolean) - Whether contract is signed
      - `documents_notes` (text) - Notes about documents
      - `profile_photo_url` (text, nullable) - Profile photo
      - `document_attachment_url` (text, nullable) - Document attachment
      - `has_vehicle` (boolean) - Whether staff has a vehicle
      - `vehicle_type` (text, nullable) - Type of vehicle
      - `internal_notes` (text) - Internal notes about staff member
      - `is_active` (boolean) - Whether staff member is active in the system
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on master_staff table
    - Add policies for authenticated users to view master staff
    - Only admins can create, update, or delete master staff
*/

-- Create master_staff table
CREATE TABLE IF NOT EXISTS master_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'guide',
  role_custom text,
  staff_type text NOT NULL DEFAULT 'employee',
  email text,
  phone text,
  emergency_contact text,
  availability text NOT NULL DEFAULT 'available',
  availability_notes text DEFAULT '',
  payment_method text,
  id_verified boolean DEFAULT false,
  contract_signed boolean DEFAULT false,
  documents_notes text DEFAULT '',
  profile_photo_url text,
  document_attachment_url text,
  has_vehicle boolean DEFAULT false,
  vehicle_type text,
  internal_notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE master_staff ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view active master staff
CREATE POLICY "Authenticated users can view active master staff"
  ON master_staff
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Admins can view all master staff (including inactive)
CREATE POLICY "Admins can view all master staff"
  ON master_staff
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can insert master staff
CREATE POLICY "Admins can insert master staff"
  ON master_staff
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can update master staff
CREATE POLICY "Admins can update master staff"
  ON master_staff
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can delete master staff
CREATE POLICY "Admins can delete master staff"
  ON master_staff
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_master_staff_role ON master_staff(role);
CREATE INDEX IF NOT EXISTS idx_master_staff_active ON master_staff(is_active);
CREATE INDEX IF NOT EXISTS idx_master_staff_availability ON master_staff(availability);