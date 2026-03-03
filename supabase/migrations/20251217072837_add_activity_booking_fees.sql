/*
  # Add Activity Booking Fees System

  ## Overview
  Adds a booking fee tracking system for activities, allowing managers and admins
  to record required booking/reservation fees (e.g., museum tickets, permits).

  ## New Tables
  - `activity_booking_fees`
    - `id` (uuid, primary key) - Unique identifier
    - `activity_id` (uuid, foreign key) - References itinerary_entries table
    - `applies_to` (text) - Who the fee applies to: 'guest' or 'guide'
    - `amount` (numeric) - Fee amount
    - `currency` (text) - Currency code (default 'SAR')
    - `booking_required` (boolean) - Whether booking is required (default true)
    - `status` (text) - Booking status: 'booked', 'pending', 'not_required'
    - `booking_reference` (text) - Optional booking reference number
    - `notes` (text) - Optional notes about the booking
    - `created_at` (timestamptz) - Record creation timestamp
    - `updated_at` (timestamptz) - Record update timestamp

  ## Security
  - Enable RLS on activity_booking_fees table
  - Only users with 'manager' or 'admin' role can view booking fees
  - Only users with 'manager' or 'admin' role can insert/update/delete booking fees
  - Trip leaders and shared users cannot see booking fee information

  ## Important Notes
  1. Booking fees are stored at the activity level for internal cost tracking
  2. Fees do not affect activity scheduling, only cost management
  3. Multiple booking fees can exist per activity (one for guest, one for guide, etc.)
*/

-- Create activity booking fees table
CREATE TABLE IF NOT EXISTS activity_booking_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES itinerary_entries(id) ON DELETE CASCADE,
  applies_to text NOT NULL CHECK (applies_to IN ('guest', 'guide')),
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'SAR',
  booking_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('booked', 'pending', 'not_required')),
  booking_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups by activity
CREATE INDEX IF NOT EXISTS idx_booking_fees_activity_id ON activity_booking_fees(activity_id);

-- Enable RLS
ALTER TABLE activity_booking_fees ENABLE ROW LEVEL SECURITY;

-- Policy: Only managers and admins can view booking fees
CREATE POLICY "Managers and admins can view booking fees"
  ON activity_booking_fees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

-- Policy: Only managers and admins can insert booking fees
CREATE POLICY "Managers and admins can insert booking fees"
  ON activity_booking_fees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

-- Policy: Only managers and admins can update booking fees
CREATE POLICY "Managers and admins can update booking fees"
  ON activity_booking_fees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

-- Policy: Only managers and admins can delete booking fees
CREATE POLICY "Managers and admins can delete booking fees"
  ON activity_booking_fees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_booking_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activity_booking_fees_updated_at
  BEFORE UPDATE ON activity_booking_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_booking_fees_updated_at();