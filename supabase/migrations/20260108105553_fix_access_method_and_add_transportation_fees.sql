/*
  # Fix Access Method Constraints and Add Transportation Fees

  ## Changes
  1. Add 'n_a' option to access_method constraints for accommodations and activities
  2. Create transportation_booking_fees table for tracking booking fees on transportation
  
  ## Notes
  - Allows marking access method as not applicable
  - Transportation fees follow same pattern as activity booking fees
  - RLS policies ensure only admins and editors can manage fees
*/

-- Drop existing constraints and add new ones with 'n_a' option
ALTER TABLE accommodations 
  DROP CONSTRAINT IF EXISTS accommodations_access_method_check;

ALTER TABLE accommodations
  ADD CONSTRAINT accommodations_access_method_check 
  CHECK (access_method IN ('pdf_voucher', 'barcode', 'eticket', 'front_desk', 'n_a'));

ALTER TABLE activities
  DROP CONSTRAINT IF EXISTS activities_access_method_check;

ALTER TABLE activities
  ADD CONSTRAINT activities_access_method_check
  CHECK (access_method IN ('pdf_ticket', 'barcode', 'qr_code', 'evoucher', 'physical_ticket', 'n_a'));

-- Create transportation_booking_fees table
CREATE TABLE IF NOT EXISTS transportation_booking_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transportation_id uuid NOT NULL REFERENCES transportation(id) ON DELETE CASCADE,
  fee_name text NOT NULL,
  fee_amount numeric(10, 2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  fee_type text DEFAULT 'booking' CHECK (fee_type IN ('booking', 'service', 'processing', 'other')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transportation_booking_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transportation_booking_fees
CREATE POLICY "Authenticated users can view transportation booking fees"
  ON transportation_booking_fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert transportation booking fees"
  ON transportation_booking_fees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update transportation booking fees"
  ON transportation_booking_fees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete transportation booking fees"
  ON transportation_booking_fees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transportation_booking_fees_transportation_id 
  ON transportation_booking_fees(transportation_id);

-- Create updated_at trigger
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
