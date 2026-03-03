/*
  # Create Master Clients Table

  ## Overview
  This migration creates a master database table for client information.

  ## New Tables
  1. master_clients - Clients database
    - `id` (uuid, primary key)
    - `name` (text, required) - Client's full name or company name
    - `company_name` (text, nullable) - Company name if different from name
    - `email` (text) - Primary email
    - `phone` (text) - Primary phone
    - `alternate_phone` (text) - Secondary contact
    - `address` (text) - Full address
    - `city` (text) - City
    - `country` (text) - Country
    - `nationality` (text) - Nationality
    - `date_of_birth` (date) - Date of birth
    - `passport_number` (text) - Passport number
    - `passport_expiry` (date) - Passport expiry date
    - `dietary_restrictions` (text) - Special dietary needs
    - `medical_conditions` (text) - Medical conditions to be aware of
    - `emergency_contact_name` (text) - Emergency contact name
    - `emergency_contact_phone` (text) - Emergency contact phone
    - `preferred_language` (text) - Preferred communication language
    - `client_type` (text) - Individual, corporate, travel_agency
    - `vip_status` (boolean) - VIP status
    - `notes` (text) - Internal notes
    - `is_active` (boolean) - Active status
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on master_clients table
  - Managers and admins can manage clients
  - All authenticated users can view clients
*/

-- Create master_clients table
CREATE TABLE IF NOT EXISTS master_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text,
  email text,
  phone text,
  alternate_phone text,
  address text,
  city text,
  country text,
  nationality text,
  date_of_birth date,
  passport_number text,
  passport_expiry date,
  dietary_restrictions text,
  medical_conditions text,
  emergency_contact_name text,
  emergency_contact_phone text,
  preferred_language text DEFAULT 'English',
  client_type text DEFAULT 'individual' CHECK (client_type IN ('individual', 'corporate', 'travel_agency')),
  vip_status boolean DEFAULT false,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_master_clients_name ON master_clients(name);
CREATE INDEX IF NOT EXISTS idx_master_clients_email ON master_clients(email);
CREATE INDEX IF NOT EXISTS idx_master_clients_phone ON master_clients(phone);
CREATE INDEX IF NOT EXISTS idx_master_clients_active ON master_clients(is_active);
CREATE INDEX IF NOT EXISTS idx_master_clients_client_type ON master_clients(client_type);

-- Enable RLS
ALTER TABLE master_clients ENABLE ROW LEVEL SECURITY;

-- Policies for master_clients
CREATE POLICY "All authenticated users can view clients"
  ON master_clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert clients"
  ON master_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update clients"
  ON master_clients FOR UPDATE
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

CREATE POLICY "Managers and admins can delete clients"
  ON master_clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_master_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_master_clients_updated_at
  BEFORE UPDATE ON master_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_master_clients_updated_at();