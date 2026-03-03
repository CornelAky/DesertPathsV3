/*
  # Add Trip Description and Default Customer Support

  ## Overview
  This migration adds support for trip descriptions and handles imported itineraries
  that don't have an associated customer yet.

  ## Changes
  
  1. New Columns
    - `trips.description` (text, nullable) - Optional description for the trip
    - `trips.notes` (text, nullable) - Additional notes for the trip
    
  2. Modified Constraints
    - Make `customer_id` nullable to support importing itineraries before assigning customers
    - This allows admins to import itineraries and assign customers later
  
  ## Notes
  - Existing trips will have NULL description/notes (which is fine)
  - New imports can now include descriptions
  - Admins should assign customers to imported trips when ready
*/

-- Add description and notes columns to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS notes text;

-- Make customer_id nullable to support importing itineraries without a customer first
ALTER TABLE trips 
ALTER COLUMN customer_id DROP NOT NULL;
