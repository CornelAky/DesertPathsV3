/*
  # Add Public Journey Data Access Function

  1. New Function
    - `get_public_journey_data` - Fetches complete journey data for valid share tokens
    - Bypasses RLS using SECURITY DEFINER
    - Returns journey, days, accommodations, activities, dining, and transportation

  2. Security
    - Only returns data if the share token is valid and not expired
    - No authentication required (public access)
*/

-- Function to get complete journey data for a valid share token
CREATE OR REPLACE FUNCTION get_public_journey_data(share_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_record shareable_itinerary_links;
  result jsonb;
BEGIN
  -- Validate token
  SELECT * INTO link_record
  FROM shareable_itinerary_links
  WHERE token = share_token
  AND is_active = true
  AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Invalid or expired link',
      'valid', false
    );
  END IF;

  -- Fetch all data in one go
  SELECT jsonb_build_object(
    'valid', true,
    'journey', (
      SELECT row_to_json(j.*)
      FROM journeys j
      WHERE j.id = link_record.journey_id
    ),
    'customer', (
      SELECT row_to_json(c.*)
      FROM journeys j
      LEFT JOIN customers c ON c.id = j.customer_id
      WHERE j.id = link_record.journey_id
    ),
    'days', (
      SELECT COALESCE(jsonb_agg(d.* ORDER BY d.day_number), '[]'::jsonb)
      FROM itinerary_days d
      WHERE d.journey_id = link_record.journey_id
    ),
    'accommodations', (
      SELECT COALESCE(jsonb_agg(a.*), '[]'::jsonb)
      FROM accommodations a
      WHERE a.journey_id = link_record.journey_id
    ),
    'activities', (
      SELECT COALESCE(jsonb_agg(act.* ORDER BY act.timeline_order), '[]'::jsonb)
      FROM activities act
      WHERE act.journey_id = link_record.journey_id
    ),
    'dining', (
      SELECT COALESCE(jsonb_agg(d.* ORDER BY d.timeline_order), '[]'::jsonb)
      FROM dining d
      WHERE d.journey_id = link_record.journey_id
    ),
    'transportation', (
      SELECT COALESCE(jsonb_agg(t.*), '[]'::jsonb)
      FROM transportation t
      WHERE t.journey_id = link_record.journey_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to anon users
GRANT EXECUTE ON FUNCTION get_public_journey_data(text) TO anon;
GRANT EXECUTE ON FUNCTION get_public_journey_data(text) TO authenticated;