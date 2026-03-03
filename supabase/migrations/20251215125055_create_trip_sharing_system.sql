/*
  # Trip Sharing System

  ## Overview
  Implements secure sharing mechanism for itinerary tables with:
  - Direct user-to-user sharing with permission levels
  - Shareable links with optional expiration
  - Activity logging for audit trail
  - Real-time synchronization support

  ## New Tables

  ### `trip_shares`
  Tracks direct sharing between users
  - `id` (uuid, primary key)
  - `trip_id` (uuid, foreign key to trips)
  - `shared_by` (uuid, foreign key to users) - admin who shared
  - `shared_with` (uuid, foreign key to users) - user receiving access
  - `permission_level` (text) - 'view' or 'edit'
  - `created_at` (timestamptz)
  - `revoked_at` (timestamptz, nullable) - when access was revoked
  - `is_active` (boolean) - quick check if share is active

  ### `trip_share_links`
  Manages shareable links with tokens
  - `id` (uuid, primary key)
  - `trip_id` (uuid, foreign key to trips)
  - `created_by` (uuid, foreign key to users)
  - `share_token` (text, unique) - secure random token for URL
  - `permission_level` (text) - 'view' or 'edit'
  - `expires_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  - `is_active` (boolean)
  - `access_count` (integer) - track how many times link was used
  - `last_accessed_at` (timestamptz, nullable)

  ### `itinerary_activity_log`
  Audit trail for all itinerary changes
  - `id` (uuid, primary key)
  - `trip_id` (uuid, foreign key to trips)
  - `entry_id` (uuid, nullable, foreign key to itinerary_entries)
  - `user_id` (uuid, foreign key to users)
  - `action` (text) - 'created', 'updated', 'deleted', 'shared', 'revoked'
  - `field_name` (text, nullable) - which field was changed
  - `old_value` (text, nullable)
  - `new_value` (text, nullable)
  - `timestamp` (timestamptz)
  - `user_email` (text) - cached for display
  - `metadata` (jsonb, nullable) - additional context

  ## Security
  - RLS enabled on all tables
  - Admins can share any trip
  - Shared users can only access based on their permission level
  - Share links require valid token and expiration check
  - Activity logs are read-only for shared users
  - Only admins can revoke access

  ## Indexes
  - trip_shares: (trip_id, shared_with, is_active)
  - trip_share_links: (share_token), (trip_id, is_active)
  - itinerary_activity_log: (trip_id, timestamp), (entry_id)
*/

-- Create trip_shares table
CREATE TABLE IF NOT EXISTS trip_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level text NOT NULL CHECK (permission_level IN ('view', 'edit')) DEFAULT 'view',
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(trip_id, shared_with)
);

-- Create trip_share_links table
CREATE TABLE IF NOT EXISTS trip_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64'),
  permission_level text NOT NULL CHECK (permission_level IN ('view', 'edit')) DEFAULT 'view',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz
);

-- Create itinerary_activity_log table
CREATE TABLE IF NOT EXISTS itinerary_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES itinerary_entries(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'shared', 'revoked', 'viewed', 'accessed')),
  field_name text,
  old_value text,
  new_value text,
  timestamp timestamptz DEFAULT now(),
  user_email text NOT NULL,
  metadata jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_shares_trip_user 
  ON trip_shares(trip_id, shared_with, is_active);

CREATE INDEX IF NOT EXISTS idx_trip_shares_active 
  ON trip_shares(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_trip_share_links_token 
  ON trip_share_links(share_token) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_trip_share_links_trip 
  ON trip_share_links(trip_id, is_active);

CREATE INDEX IF NOT EXISTS idx_activity_log_trip_time 
  ON itinerary_activity_log(trip_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_entry 
  ON itinerary_activity_log(entry_id) WHERE entry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_log_user
  ON itinerary_activity_log(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE trip_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_shares

-- Admins and involved users can view shares
CREATE POLICY "Admins and shared users can view trip shares"
  ON trip_shares FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR shared_by = auth.uid()
    OR shared_with = auth.uid()
  );

-- Admins can create shares
CREATE POLICY "Admins can create trip shares"
  ON trip_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    AND shared_by = auth.uid()
  );

-- Admins can update shares
CREATE POLICY "Admins can update trip shares"
  ON trip_shares FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Admins can delete shares
CREATE POLICY "Admins can delete trip shares"
  ON trip_shares FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policies for trip_share_links

-- Admins can view share links
CREATE POLICY "Admins can view share links"
  ON trip_share_links FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Admins can create share links
CREATE POLICY "Admins can create share links"
  ON trip_share_links FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    AND created_by = auth.uid()
  );

-- Admins can update share links
CREATE POLICY "Admins can update share links"
  ON trip_share_links FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Admins can delete share links
CREATE POLICY "Admins can delete share links"
  ON trip_share_links FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policies for itinerary_activity_log

-- Admins and shared users can view activity logs
CREATE POLICY "Users can view activity logs for accessible trips"
  ON itinerary_activity_log FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_shares.trip_id = itinerary_activity_log.trip_id
      AND trip_shares.shared_with = auth.uid()
      AND trip_shares.is_active = true
      AND trip_shares.revoked_at IS NULL
    )
  );

-- Authenticated users can create activity logs
CREATE POLICY "Users can create activity logs"
  ON itinerary_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create helper function to check trip access
CREATE OR REPLACE FUNCTION has_trip_access(p_trip_id uuid, p_user_id uuid, required_permission text DEFAULT 'view')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_role text;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM users
  WHERE id = p_user_id;

  -- Admins have full access
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Check if user has direct share access
  IF EXISTS (
    SELECT 1 FROM trip_shares
    WHERE trip_id = p_trip_id
    AND shared_with = p_user_id
    AND is_active = true
    AND revoked_at IS NULL
    AND (
      required_permission = 'view'
      OR (required_permission = 'edit' AND permission_level = 'edit')
    )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Create function to validate share token
CREATE OR REPLACE FUNCTION validate_share_token(p_token text)
RETURNS TABLE(trip_id uuid, permission_level text, is_valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tsl.trip_id,
    tsl.permission_level,
    (tsl.is_active = true 
     AND (tsl.expires_at IS NULL OR tsl.expires_at > now()))::boolean as is_valid
  FROM trip_share_links tsl
  WHERE tsl.share_token = p_token;
END;
$$;

-- Create function to log share access via link
CREATE OR REPLACE FUNCTION log_share_link_access(p_token text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link_id uuid;
  v_trip_id uuid;
  v_user_email text;
BEGIN
  -- Get link details
  SELECT id, trip_id INTO v_link_id, v_trip_id
  FROM trip_share_links
  WHERE share_token = p_token
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now());

  IF v_link_id IS NULL THEN
    RETURN;
  END IF;

  -- Update access count and timestamp
  UPDATE trip_share_links
  SET 
    access_count = access_count + 1,
    last_accessed_at = now()
  WHERE id = v_link_id;

  -- Get user email
  SELECT email INTO v_user_email
  FROM users
  WHERE id = p_user_id;

  -- Log the access
  INSERT INTO itinerary_activity_log (trip_id, user_id, action, user_email, metadata)
  VALUES (
    v_trip_id,
    p_user_id,
    'accessed',
    COALESCE(v_user_email, 'unknown'),
    jsonb_build_object('via', 'share_link', 'token_id', v_link_id)
  );
END;
$$;

-- Create function to log activity
CREATE OR REPLACE FUNCTION log_itinerary_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email text;
  v_trip_id uuid;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM users
  WHERE id = auth.uid();

  -- Get trip_id based on the entry
  IF TG_TABLE_NAME = 'itinerary_entries' THEN
    v_trip_id := COALESCE(NEW.trip_id, OLD.trip_id);
  END IF;

  -- Log the activity
  IF TG_OP = 'INSERT' THEN
    INSERT INTO itinerary_activity_log (trip_id, entry_id, user_id, action, user_email)
    VALUES (v_trip_id, NEW.id, auth.uid(), 'created', COALESCE(v_user_email, 'unknown'));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO itinerary_activity_log (trip_id, entry_id, user_id, action, user_email)
    VALUES (v_trip_id, NEW.id, auth.uid(), 'updated', COALESCE(v_user_email, 'unknown'));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO itinerary_activity_log (trip_id, entry_id, user_id, action, user_email)
    VALUES (v_trip_id, OLD.id, auth.uid(), 'deleted', COALESCE(v_user_email, 'unknown'));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for itinerary_entries
DROP TRIGGER IF EXISTS log_itinerary_changes ON itinerary_entries;
CREATE TRIGGER log_itinerary_changes
  AFTER INSERT OR UPDATE OR DELETE ON itinerary_entries
  FOR EACH ROW
  EXECUTE FUNCTION log_itinerary_activity();

-- Update itinerary_entries RLS to allow shared access
DROP POLICY IF EXISTS "Admins and shared users can view itinerary entries" ON itinerary_entries;
CREATE POLICY "Admins and shared users can view itinerary entries"
  ON itinerary_entries FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_trip_access(trip_id, auth.uid(), 'view')
  );

DROP POLICY IF EXISTS "Admins and editors can update itinerary entries" ON itinerary_entries;
CREATE POLICY "Admins and editors can update itinerary entries"
  ON itinerary_entries FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_trip_access(trip_id, auth.uid(), 'edit')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_trip_access(trip_id, auth.uid(), 'edit')
  );

DROP POLICY IF EXISTS "Admins and editors can delete itinerary entries" ON itinerary_entries;
CREATE POLICY "Admins and editors can delete itinerary entries"
  ON itinerary_entries FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_trip_access(trip_id, auth.uid(), 'edit')
  );

DROP POLICY IF EXISTS "Admins and editors can insert itinerary entries" ON itinerary_entries;
CREATE POLICY "Admins and editors can insert itinerary entries"
  ON itinerary_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_trip_access(trip_id, auth.uid(), 'edit')
  );

-- Update trips RLS to allow shared access for viewing
DROP POLICY IF EXISTS "Admins and shared users can view trips" ON trips;
CREATE POLICY "Admins and shared users can view trips"
  ON trips FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR has_trip_access(id, auth.uid(), 'view')
  );
