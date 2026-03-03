/*
  # Journey Staff Payments and Vehicle Usage Tracking

  1. New Tables
    - `journey_staff_payments`
      - Tracks multiple payment entries for each staff member on a journey
      - Supports different payment types (advance, final, expenses, bonus, etc.)
      - Records payment amount, date, status, and notes
      - Links to journey_staff for journey-specific payments

  2. Changes
    - Add `uses_registered_vehicle` flag to `journey_staff` table
    - Add `uses_registered_vehicle` flag to `journey_staff_day_assignments` table
    - These flags indicate whether staff member is using their registered vehicle on specific journey/day

  3. Security
    - Enable RLS on journey_staff_payments table
    - Add policies for authenticated users to manage payments
*/

-- Create payment type enum
DO $$ BEGIN
  CREATE TYPE staff_payment_type AS ENUM (
    'advance',
    'final',
    'expenses',
    'bonus',
    'accommodation',
    'meals',
    'transportation',
    'equipment',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status_type AS ENUM (
    'pending',
    'processing',
    'completed',
    'cancelled',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create journey_staff_payments table
CREATE TABLE IF NOT EXISTS journey_staff_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_staff_id uuid NOT NULL REFERENCES journey_staff(id) ON DELETE CASCADE,
  payment_type staff_payment_type NOT NULL DEFAULT 'advance',
  amount numeric(10, 2) NOT NULL,
  currency text DEFAULT 'SAR',
  payment_date date,
  payment_method text,
  status payment_status_type DEFAULT 'pending',
  reference_number text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_journey_staff_payments_journey_staff_id ON journey_staff_payments(journey_staff_id);
CREATE INDEX IF NOT EXISTS idx_journey_staff_payments_payment_date ON journey_staff_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_journey_staff_payments_status ON journey_staff_payments(status);

-- Add vehicle usage flag to journey_staff
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journey_staff' AND column_name = 'uses_registered_vehicle'
  ) THEN
    ALTER TABLE journey_staff ADD COLUMN uses_registered_vehicle boolean DEFAULT true;
  END IF;
END $$;

-- Add vehicle usage flag to journey_staff_day_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journey_staff_day_assignments' AND column_name = 'uses_registered_vehicle'
  ) THEN
    ALTER TABLE journey_staff_day_assignments ADD COLUMN uses_registered_vehicle boolean DEFAULT true;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE journey_staff_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journey_staff_payments

-- Select policy: Users can view payments for journeys they have access to
CREATE POLICY "Users can view payments for their accessible journeys"
  ON journey_staff_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journey_staff js
      INNER JOIN journeys j ON j.id = js.journey_id
      WHERE js.id = journey_staff_payments.journey_staff_id
      AND (
        j.created_by = auth.uid()
        OR has_edit_permission(j.id)
        OR is_admin()
      )
    )
  );

-- Insert policy: Users can add payments for journeys they have edit access to
CREATE POLICY "Users can add payments for editable journeys"
  ON journey_staff_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journey_staff js
      INNER JOIN journeys j ON j.id = js.journey_id
      WHERE js.id = journey_staff_payments.journey_staff_id
      AND (
        j.created_by = auth.uid()
        OR has_edit_permission(j.id)
        OR is_admin()
      )
    )
  );

-- Update policy: Users can update payments for journeys they have edit access to
CREATE POLICY "Users can update payments for editable journeys"
  ON journey_staff_payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journey_staff js
      INNER JOIN journeys j ON j.id = js.journey_id
      WHERE js.id = journey_staff_payments.journey_staff_id
      AND (
        j.created_by = auth.uid()
        OR has_edit_permission(j.id)
        OR is_admin()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journey_staff js
      INNER JOIN journeys j ON j.id = js.journey_id
      WHERE js.id = journey_staff_payments.journey_staff_id
      AND (
        j.created_by = auth.uid()
        OR has_edit_permission(j.id)
        OR is_admin()
      )
    )
  );

-- Delete policy: Users can delete payments for journeys they have edit access to
CREATE POLICY "Users can delete payments for editable journeys"
  ON journey_staff_payments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journey_staff js
      INNER JOIN journeys j ON j.id = js.journey_id
      WHERE js.id = journey_staff_payments.journey_staff_id
      AND (
        j.created_by = auth.uid()
        OR has_edit_permission(j.id)
        OR is_admin()
      )
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_journey_staff_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journey_staff_payments_updated_at ON journey_staff_payments;

CREATE TRIGGER journey_staff_payments_updated_at
  BEFORE UPDATE ON journey_staff_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_staff_payments_updated_at();
