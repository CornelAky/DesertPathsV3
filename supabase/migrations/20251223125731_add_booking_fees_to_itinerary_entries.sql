/*
  # Add Booking Fee Fields to Itinerary Entries

  ## Overview
  Adds booking fee tracking directly to itinerary entries, making the Day-by-Day
  entries the single source of truth for all booking fees.

  ## Changes to Tables
  - `itinerary_entries`
    - `guest_fee` (numeric) - Fee amount for guests, nullable
    - `guide_fee` (numeric) - Fee amount for guides, nullable
    - `fee_currency` (text) - Currency code for fees (default 'SAR')
    - `fee_status` (text) - Booking status: 'booked', 'pending', 'not_required', nullable
    - `booking_reference` (text) - Optional booking reference number
    - `fee_notes` (text) - Optional notes about the fees

  ## Important Notes
  1. Fees are now stored directly in each itinerary entry
  2. Multiple fee types can be stored per entry (guest_fee and guide_fee)
  3. The Booking Fee Summary will aggregate directly from itinerary_entries
  4. All fee fields are optional and can be left null
*/

-- Add fee columns to itinerary_entries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_entries' AND column_name = 'guest_fee'
  ) THEN
    ALTER TABLE itinerary_entries ADD COLUMN guest_fee numeric CHECK (guest_fee >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_entries' AND column_name = 'guide_fee'
  ) THEN
    ALTER TABLE itinerary_entries ADD COLUMN guide_fee numeric CHECK (guide_fee >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_entries' AND column_name = 'fee_currency'
  ) THEN
    ALTER TABLE itinerary_entries ADD COLUMN fee_currency text DEFAULT 'SAR';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_entries' AND column_name = 'fee_status'
  ) THEN
    ALTER TABLE itinerary_entries ADD COLUMN fee_status text CHECK (fee_status IN ('booked', 'pending', 'not_required'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_entries' AND column_name = 'booking_reference'
  ) THEN
    ALTER TABLE itinerary_entries ADD COLUMN booking_reference text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'itinerary_entries' AND column_name = 'fee_notes'
  ) THEN
    ALTER TABLE itinerary_entries ADD COLUMN fee_notes text;
  END IF;
END $$;
