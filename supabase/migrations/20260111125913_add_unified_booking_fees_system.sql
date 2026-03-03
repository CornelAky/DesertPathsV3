/*
  # Unified Booking Fees System with Per-PAX Calculation

  ## Overview
  Standardizes booking fees across all itinerary items (activities, transportation, 
  accommodations, dining) and adds per-PAX automatic calculation.

  ## Changes Made

  ### 1. New Tables
  - `accommodation_booking_fees` - Booking fees for accommodations
  - `dining_booking_fees` - Booking fees for dining/meals

  ### 2. Updated `activity_booking_fees` Table
  - Add `fee_calculation_type` - Either 'per_person' or 'per_group'
  - Add `unit_price` - Price per person when using per_person calculation
  - Keep existing amount field for total/group pricing
  - The UI will auto-calculate: amount = unit_price × (guest_count + staff_count)

  ### 3. Updated `transportation_booking_fees` Table
  - Restructure to match activity_booking_fees pattern
  - Add guest_count, staff_count, unit_price, fee_calculation_type
  - Migrate existing data

  ## Fee Calculation Logic
  - **per_person**: Total = unit_price × (guest_count + staff_count)
  - **per_group**: Total = amount (fixed price regardless of count)

  ## Security
  - All tables have RLS enabled
  - Only authenticated users can view
  - Only admins/managers can insert/update/delete
*/

-- Add new columns to activity_booking_fees
ALTER TABLE activity_booking_fees
  ADD COLUMN IF NOT EXISTS fee_calculation_type text DEFAULT 'per_group' 
    CHECK (fee_calculation_type IN ('per_person', 'per_group')),
  ADD COLUMN IF NOT EXISTS unit_price numeric(10, 2) DEFAULT 0 CHECK (unit_price >= 0);

-- Update transportation_booking_fees to match the unified structure
-- First, rename the old table
ALTER TABLE transportation_booking_fees RENAME TO transportation_booking_fees_old;

-- Create new transportation_booking_fees with unified structure
CREATE TABLE IF NOT EXISTS transportation_booking_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transportation_id uuid NOT NULL REFERENCES transportation(id) ON DELETE CASCADE,
  applies_to text NOT NULL DEFAULT 'guest' CHECK (applies_to IN ('guest', 'guide', 'both')),
  amount numeric(10, 2) DEFAULT 0 CHECK (amount >= 0),
  unit_price numeric(10, 2) DEFAULT 0 CHECK (unit_price >= 0),
  fee_calculation_type text DEFAULT 'per_group' CHECK (fee_calculation_type IN ('per_person', 'per_group')),
  currency text DEFAULT 'SAR',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'n_a')),
  booking_required boolean DEFAULT false,
  booking_reference text,
  notes text,
  guest_count integer DEFAULT 1 CHECK (guest_count >= 0),
  staff_count integer DEFAULT 0 CHECK (staff_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migrate old transportation fees data
INSERT INTO transportation_booking_fees (
  transportation_id, 
  applies_to, 
  amount, 
  currency, 
  notes, 
  created_at
)
SELECT 
  transportation_id,
  'both' as applies_to,
  fee_amount,
  currency,
  COALESCE(fee_name || ': ' || notes, fee_name, notes) as notes,
  created_at
FROM transportation_booking_fees_old;

-- Drop old table
DROP TABLE transportation_booking_fees_old;

-- Enable RLS on new transportation_booking_fees
ALTER TABLE transportation_booking_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transportation_booking_fees
CREATE POLICY "Authenticated users can view transportation booking fees"
  ON transportation_booking_fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert transportation booking fees"
  ON transportation_booking_fees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update transportation booking fees"
  ON transportation_booking_fees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete transportation booking fees"
  ON transportation_booking_fees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Create accommodation_booking_fees table
CREATE TABLE IF NOT EXISTS accommodation_booking_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid NOT NULL REFERENCES accommodations(id) ON DELETE CASCADE,
  applies_to text NOT NULL DEFAULT 'guest' CHECK (applies_to IN ('guest', 'guide', 'both')),
  amount numeric(10, 2) DEFAULT 0 CHECK (amount >= 0),
  unit_price numeric(10, 2) DEFAULT 0 CHECK (unit_price >= 0),
  fee_calculation_type text DEFAULT 'per_group' CHECK (fee_calculation_type IN ('per_person', 'per_group')),
  currency text DEFAULT 'SAR',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'n_a')),
  booking_required boolean DEFAULT false,
  booking_reference text,
  notes text,
  guest_count integer DEFAULT 1 CHECK (guest_count >= 0),
  staff_count integer DEFAULT 0 CHECK (staff_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE accommodation_booking_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accommodation_booking_fees
CREATE POLICY "Authenticated users can view accommodation booking fees"
  ON accommodation_booking_fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert accommodation booking fees"
  ON accommodation_booking_fees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update accommodation booking fees"
  ON accommodation_booking_fees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete accommodation booking fees"
  ON accommodation_booking_fees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Create dining_booking_fees table
CREATE TABLE IF NOT EXISTS dining_booking_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dining_id uuid NOT NULL REFERENCES dining(id) ON DELETE CASCADE,
  applies_to text NOT NULL DEFAULT 'guest' CHECK (applies_to IN ('guest', 'guide', 'both')),
  amount numeric(10, 2) DEFAULT 0 CHECK (amount >= 0),
  unit_price numeric(10, 2) DEFAULT 0 CHECK (unit_price >= 0),
  fee_calculation_type text DEFAULT 'per_group' CHECK (fee_calculation_type IN ('per_person', 'per_group')),
  currency text DEFAULT 'SAR',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'n_a')),
  booking_required boolean DEFAULT false,
  booking_reference text,
  notes text,
  guest_count integer DEFAULT 1 CHECK (guest_count >= 0),
  staff_count integer DEFAULT 0 CHECK (staff_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dining_booking_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dining_booking_fees
CREATE POLICY "Authenticated users can view dining booking fees"
  ON dining_booking_fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert dining booking fees"
  ON dining_booking_fees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update dining booking fees"
  ON dining_booking_fees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete dining booking fees"
  ON dining_booking_fees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transportation_booking_fees_transportation_id 
  ON transportation_booking_fees(transportation_id);

CREATE INDEX IF NOT EXISTS idx_accommodation_booking_fees_accommodation_id 
  ON accommodation_booking_fees(accommodation_id);

CREATE INDEX IF NOT EXISTS idx_dining_booking_fees_dining_id 
  ON dining_booking_fees(dining_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_transportation_booking_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transportation_booking_fees_updated_at
  BEFORE UPDATE ON transportation_booking_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_transportation_booking_fees_updated_at();

CREATE OR REPLACE FUNCTION update_accommodation_booking_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accommodation_booking_fees_updated_at
  BEFORE UPDATE ON accommodation_booking_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_accommodation_booking_fees_updated_at();

CREATE OR REPLACE FUNCTION update_dining_booking_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dining_booking_fees_updated_at
  BEFORE UPDATE ON dining_booking_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_dining_booking_fees_updated_at();
