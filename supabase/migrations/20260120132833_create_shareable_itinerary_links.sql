/*
  # Create Shareable Itinerary Links System

  1. New Table
    - `shareable_itinerary_links`
      - `id` (uuid, primary key)
      - `journey_id` (uuid, foreign key to journeys)
      - `token` (text, unique URL token)
      - `expires_at` (timestamptz)
      - `created_by` (uuid, foreign key to users)
      - `is_active` (boolean, default true)
      - `view_count` (integer, default 0)
      - `last_viewed_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `shareable_itinerary_links` table
    - Admins and journey owners can create and manage links
    - Public can view if token is valid and not expired
*/

-- Create the shareable_itinerary_links table
CREATE TABLE IF NOT EXISTS shareable_itinerary_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  view_count integer DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_shareable_links_token ON shareable_itinerary_links(token);
CREATE INDEX IF NOT EXISTS idx_shareable_links_journey ON shareable_itinerary_links(journey_id);
CREATE INDEX IF NOT EXISTS idx_shareable_links_expires ON shareable_itinerary_links(expires_at);

-- Enable RLS
ALTER TABLE shareable_itinerary_links ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and journey creators can view their links
CREATE POLICY "Users can view shareable links for their journeys"
  ON shareable_itinerary_links
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = shareable_itinerary_links.journey_id
      AND journeys.created_by = auth.uid()
    )
  );

-- Policy: Admins and journey creators can create links
CREATE POLICY "Users can create shareable links for their journeys"
  ON shareable_itinerary_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = journey_id
      AND (journeys.created_by = auth.uid() OR is_admin())
    )
  );

-- Policy: Admins and creators can update links
CREATE POLICY "Users can update their shareable links"
  ON shareable_itinerary_links
  FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = shareable_itinerary_links.journey_id
      AND journeys.created_by = auth.uid()
    )
  );

-- Policy: Admins and creators can delete links
CREATE POLICY "Users can delete their shareable links"
  ON shareable_itinerary_links
  FOR DELETE
  TO authenticated
  USING (
    is_admin() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = shareable_itinerary_links.journey_id
      AND journeys.created_by = auth.uid()
    )
  );

-- Function to generate a random token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64')::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a token is valid
CREATE OR REPLACE FUNCTION is_token_valid(share_token text)
RETURNS boolean AS $$
DECLARE
  link_record shareable_itinerary_links;
BEGIN
  SELECT * INTO link_record
  FROM shareable_itinerary_links
  WHERE token = share_token
  AND is_active = true
  AND expires_at > now();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment view count and update last viewed
CREATE OR REPLACE FUNCTION track_link_view(share_token text)
RETURNS void AS $$
BEGIN
  UPDATE shareable_itinerary_links
  SET
    view_count = view_count + 1,
    last_viewed_at = now()
  WHERE token = share_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;