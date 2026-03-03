/*
  # Add Internal Booking Management Fields
  
  1. Changes
    - Add internal_booking_status enum type for internal tracking
    - Add internal_booking_status column to accommodations table
    - Add internal_booking_status column to activities table
    - Add internal_booking_status column to dining table
    - Add internal_booking_notes column to each table
    - Default all existing records to 'not_confirmed'
  
  2. Internal Booking Status Values
    - not_confirmed: Booking has not been confirmed yet
    - confirmed: Booking is confirmed but not paid
    - partially_paid: Booking is confirmed and partially paid
    - fully_paid: Booking is confirmed and fully paid
  
  3. Notes
    - These fields are for internal management only (separate from existing booking_status)
    - Does not affect itinerary display or client-facing views
    - Allows tracking completion of all bookings for a trip
*/

-- Create internal booking status enum type
DO $$ BEGIN
  CREATE TYPE internal_booking_status_type AS ENUM (
    'not_confirmed',
    'confirmed',
    'partially_paid',
    'fully_paid'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add internal_booking_status to accommodations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accommodations' AND column_name = 'internal_booking_status'
  ) THEN
    ALTER TABLE accommodations 
    ADD COLUMN internal_booking_status internal_booking_status_type DEFAULT 'not_confirmed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accommodations' AND column_name = 'internal_booking_notes'
  ) THEN
    ALTER TABLE accommodations 
    ADD COLUMN internal_booking_notes text DEFAULT '';
  END IF;
END $$;

-- Add internal_booking_status to activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'internal_booking_status'
  ) THEN
    ALTER TABLE activities 
    ADD COLUMN internal_booking_status internal_booking_status_type DEFAULT 'not_confirmed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'internal_booking_notes'
  ) THEN
    ALTER TABLE activities 
    ADD COLUMN internal_booking_notes text DEFAULT '';
  END IF;
END $$;

-- Add internal_booking_status to dining
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'internal_booking_status'
  ) THEN
    ALTER TABLE dining 
    ADD COLUMN internal_booking_status internal_booking_status_type DEFAULT 'not_confirmed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dining' AND column_name = 'internal_booking_notes'
  ) THEN
    ALTER TABLE dining 
    ADD COLUMN internal_booking_notes text DEFAULT '';
  END IF;
END $$;