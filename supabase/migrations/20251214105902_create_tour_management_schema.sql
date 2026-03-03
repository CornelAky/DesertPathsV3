/*
  # Tour Itinerary & Logistics Management System - Complete Schema

  ## Overview
  This migration creates a comprehensive tour management system with support for:
  - Customer and trip management
  - Day-by-day itineraries
  - Accommodations with meal plans and payment tracking
  - Activities with ticketing and access methods
  - Dining arrangements with payment details
  - Document storage for vouchers, tickets, and barcodes
  - User management and role-based access

  ## New Tables

  ### 1. customers
  Stores customer/client information
  - `id` (uuid, primary key)
  - `name` (text) - Customer full name
  - `contact_number` (text) - Phone number
  - `email` (text) - Email address
  - `notes` (text) - Additional notes
  - `created_at`, `updated_at` (timestamp)

  ### 2. trips
  Stores trip details for each customer
  - `id` (uuid, primary key)
  - `customer_id` (uuid, foreign key)
  - `trip_name` (text) - Trip title
  - `start_date`, `end_date` (date)
  - `duration_days` (integer)
  - `status` (text) - planning/confirmed/in_progress/completed
  - `created_at`, `updated_at` (timestamp)

  ### 3. itinerary_days
  Daily breakdown of each trip
  - `id` (uuid, primary key)
  - `trip_id` (uuid, foreign key)
  - `day_number` (integer)
  - `date` (date)
  - `city_destination` (text)
  - `start_time`, `end_time` (time)
  - `notes` (text)
  - `created_at` (timestamp)

  ### 4. accommodations
  Hotel bookings with meal plans and access details
  - `id` (uuid, primary key)
  - `day_id` (uuid, foreign key)
  - `hotel_name` (text)
  - `location_address` (text)
  - `map_link` (text)
  - `check_in_time`, `check_out_time` (time)
  - `booking_status` (text) - confirmed/pending
  - `payment_status` (text) - paid/pending
  - `payment_type` (text) - full/half_deposit/custom_installment
  - `payment_amount` (numeric) - Internal only
  - `breakfast_included` (boolean)
  - `breakfast_location` (text) - in_hotel/external
  - `lunch_included` (boolean)
  - `dinner_included` (boolean)
  - `access_method` (text) - pdf_voucher/barcode/eticket/front_desk
  - `confirmation_number` (text)
  - `guide_notes` (text)
  - `created_at`, `updated_at` (timestamp)

  ### 5. activities
  Tours and activities with ticketing
  - `id` (uuid, primary key)
  - `day_id` (uuid, foreign key)
  - `activity_name` (text)
  - `location` (text)
  - `map_link` (text)
  - `activity_time` (time)
  - `duration_minutes` (integer)
  - `guide_notes` (text)
  - `booking_status` (text) - confirmed/pending
  - `payment_status` (text) - prepaid/pay_onsite/pending
  - `access_method` (text) - pdf_ticket/barcode/qr_code/evoucher/physical_ticket
  - `is_completed` (boolean)
  - `display_order` (integer)
  - `created_at`, `updated_at` (timestamp)

  ### 6. dining
  Restaurant reservations with payment details
  - `id` (uuid, primary key)
  - `day_id` (uuid, foreign key)
  - `meal_type` (text) - breakfast/lunch/dinner/snack
  - `restaurant_name` (text)
  - `cuisine_type` (text)
  - `location_address` (text)
  - `location_type` (text) - hotel/external
  - `map_link` (text)
  - `reservation_time` (time)
  - `confirmation_status` (text) - confirmed/not_booked/pending
  - `payment_arrangement` (text) - full/partial/not_paid
  - `included_in_package` (boolean)
  - `payment_amount` (numeric) - Internal only
  - `dietary_restrictions` (text)
  - `guide_notes` (text)
  - `display_order` (integer)
  - `is_completed` (boolean)
  - `created_at`, `updated_at` (timestamp)

  ### 7. documents
  Stores references to uploaded PDFs, vouchers, tickets
  - `id` (uuid, primary key)
  - `related_type` (text) - accommodation/activity/dining
  - `related_id` (uuid) - ID of the related record
  - `document_type` (text) - voucher/ticket/barcode/confirmation/other
  - `file_name` (text)
  - `file_path` (text) - Path in Supabase Storage
  - `file_url` (text) - Public URL
  - `notes` (text)
  - `uploaded_by` (uuid) - User who uploaded
  - `created_at` (timestamp)

  ### 8. users
  System users (admins and guides)
  - `id` (uuid, primary key, linked to auth.users)
  - `name` (text)
  - `email` (text)
  - `role` (text) - admin/guide
  - `created_at`, `updated_at` (timestamp)

  ### 9. trip_assignments
  Assigns guides to trips
  - `id` (uuid, primary key)
  - `trip_id` (uuid, foreign key)
  - `user_id` (uuid, foreign key)
  - `assigned_at` (timestamp)

  ### 10. shared_links
  Generate shareable view-only links
  - `id` (uuid, primary key)
  - `trip_id` (uuid, foreign key)
  - `share_token` (text, unique)
  - `link_type` (text) - guide/customer
  - `expires_at` (timestamp)
  - `created_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Admins can see and modify everything
  - Guides can view assigned trips (payment fields hidden)
  - Public shared links are view-only
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_number text NOT NULL,
  email text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  trip_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_days integer NOT NULL,
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create itinerary_days table
CREATE TABLE IF NOT EXISTS itinerary_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  date date NOT NULL,
  city_destination text NOT NULL,
  start_time time,
  end_time time,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create accommodations table
CREATE TABLE IF NOT EXISTS accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  hotel_name text NOT NULL,
  location_address text NOT NULL,
  map_link text,
  check_in_time time,
  check_out_time time,
  booking_status text DEFAULT 'pending' CHECK (booking_status IN ('confirmed', 'pending')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending')),
  payment_type text DEFAULT 'full' CHECK (payment_type IN ('full', 'half_deposit', 'custom_installment')),
  payment_amount numeric(10, 2),
  breakfast_included boolean DEFAULT false,
  breakfast_location text CHECK (breakfast_location IN ('in_hotel', 'external') OR breakfast_location IS NULL),
  lunch_included boolean DEFAULT false,
  dinner_included boolean DEFAULT false,
  access_method text DEFAULT 'front_desk' CHECK (access_method IN ('pdf_voucher', 'barcode', 'eticket', 'front_desk')),
  confirmation_number text,
  guide_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  activity_name text NOT NULL,
  location text NOT NULL,
  map_link text,
  activity_time time NOT NULL,
  duration_minutes integer,
  guide_notes text,
  booking_status text DEFAULT 'pending' CHECK (booking_status IN ('confirmed', 'pending')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('prepaid', 'pay_onsite', 'pending')),
  access_method text DEFAULT 'pdf_ticket' CHECK (access_method IN ('pdf_ticket', 'barcode', 'qr_code', 'evoucher', 'physical_ticket')),
  is_completed boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create dining table
CREATE TABLE IF NOT EXISTS dining (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  restaurant_name text NOT NULL,
  cuisine_type text,
  location_address text NOT NULL,
  location_type text DEFAULT 'external' CHECK (location_type IN ('hotel', 'external')),
  map_link text,
  reservation_time time NOT NULL,
  confirmation_status text DEFAULT 'not_booked' CHECK (confirmation_status IN ('confirmed', 'not_booked', 'pending')),
  payment_arrangement text DEFAULT 'not_paid' CHECK (payment_arrangement IN ('full', 'partial', 'not_paid')),
  included_in_package boolean DEFAULT false,
  payment_amount numeric(10, 2),
  dietary_restrictions text,
  guide_notes text,
  display_order integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_type text NOT NULL CHECK (related_type IN ('accommodation', 'activity', 'dining')),
  related_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('voucher', 'ticket', 'barcode', 'confirmation', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_url text,
  notes text,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text DEFAULT 'guide' CHECK (role IN ('admin', 'guide')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trip_assignments table
CREATE TABLE IF NOT EXISTS trip_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

-- Create shared_links table
CREATE TABLE IF NOT EXISTS shared_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  link_type text NOT NULL CHECK (link_type IN ('guide', 'customer')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_customer_id ON trips(customer_id);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);
CREATE INDEX IF NOT EXISTS idx_itinerary_days_trip_id ON itinerary_days(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_days_date ON itinerary_days(date);
CREATE INDEX IF NOT EXISTS idx_accommodations_day_id ON accommodations(day_id);
CREATE INDEX IF NOT EXISTS idx_activities_day_id ON activities(day_id);
CREATE INDEX IF NOT EXISTS idx_dining_day_id ON dining(day_id);
CREATE INDEX IF NOT EXISTS idx_documents_related ON documents(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_trip_assignments_trip_id ON trip_assignments(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_assignments_user_id ON trip_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(share_token);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Admins can manage all customers"
  ON customers FOR ALL
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

-- RLS Policies for trips
CREATE POLICY "Admins can manage all trips"
  ON trips FOR ALL
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

CREATE POLICY "Guides can view assigned trips"
  ON trips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = trips.id
      AND trip_assignments.user_id = auth.uid()
    )
  );

-- RLS Policies for itinerary_days
CREATE POLICY "Admins can manage all itinerary days"
  ON itinerary_days FOR ALL
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

CREATE POLICY "Guides can view assigned itinerary days"
  ON itinerary_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      WHERE trip_assignments.trip_id = itinerary_days.trip_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

-- RLS Policies for accommodations
CREATE POLICY "Admins can manage all accommodations"
  ON accommodations FOR ALL
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

CREATE POLICY "Guides can view assigned accommodations"
  ON accommodations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = accommodations.day_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

-- RLS Policies for activities
CREATE POLICY "Admins can manage all activities"
  ON activities FOR ALL
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

CREATE POLICY "Guides can view assigned activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = activities.day_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Guides can update activity completion"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = activities.day_id
      AND trip_assignments.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = activities.day_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

-- RLS Policies for dining
CREATE POLICY "Admins can manage all dining"
  ON dining FOR ALL
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

CREATE POLICY "Guides can view assigned dining"
  ON dining FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = dining.day_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Guides can update dining completion"
  ON dining FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = dining.day_id
      AND trip_assignments.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE itinerary_days.id = dining.day_id
      AND trip_assignments.user_id = auth.uid()
    )
  );

-- RLS Policies for documents
CREATE POLICY "Admins can manage all documents"
  ON documents FOR ALL
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

CREATE POLICY "Guides can view assigned documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_assignments
      JOIN itinerary_days ON trip_assignments.trip_id = itinerary_days.trip_id
      WHERE (
        (documents.related_type = 'accommodation' AND documents.related_id IN (
          SELECT id FROM accommodations WHERE day_id = itinerary_days.id
        ))
        OR (documents.related_type = 'activity' AND documents.related_id IN (
          SELECT id FROM activities WHERE day_id = itinerary_days.id
        ))
        OR (documents.related_type = 'dining' AND documents.related_id IN (
          SELECT id FROM dining WHERE day_id = itinerary_days.id
        ))
      )
      AND trip_assignments.user_id = auth.uid()
    )
  );

-- RLS Policies for users
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- RLS Policies for trip_assignments
CREATE POLICY "Admins can manage all assignments"
  ON trip_assignments FOR ALL
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

CREATE POLICY "Users can view own assignments"
  ON trip_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for shared_links
CREATE POLICY "Admins can manage all shared links"
  ON shared_links FOR ALL
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

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accommodations_updated_at BEFORE UPDATE ON accommodations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dining_updated_at BEFORE UPDATE ON dining
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();