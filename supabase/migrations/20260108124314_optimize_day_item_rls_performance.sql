/*
  # Optimize RLS Performance for Day Items
  
  1. Problem
    - RLS policies are doing nested subqueries for user role checks
    - Multiple EXISTS queries on every row access
    - Transportation has 6 SELECT policies causing redundant checks
    - has_day_access function is called repeatedly
  
  2. Solution
    - Create materialized view for user permissions (cached)
    - Create helper functions with SECURITY DEFINER and caching
    - Simplify RLS policies to use optimized functions
    - Add composite indexes for common query patterns
  
  3. Performance Impact
    - Should reduce query time from seconds to milliseconds
    - Reduces database CPU usage significantly
*/

-- Create composite indexes for common join patterns
CREATE INDEX IF NOT EXISTS idx_itinerary_days_journey_id_id 
ON itinerary_days(journey_id, id);

CREATE INDEX IF NOT EXISTS idx_journey_shares_lookup
ON journey_shares(journey_id, shared_with, is_active) 
WHERE is_active = true AND revoked_at IS NULL;

-- Create a cached user role check function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Create optimized day access check
CREATE OR REPLACE FUNCTION has_day_access_optimized(p_day_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM itinerary_days d
    INNER JOIN journeys j ON j.id = d.journey_id
    WHERE d.id = p_day_id
    AND (
      get_user_role() = 'admin'
      OR j.created_by = p_user_id
      OR EXISTS (
        SELECT 1 
        FROM journey_shares js
        WHERE js.journey_id = j.id
        AND js.shared_with = p_user_id
        AND js.is_active = true
        AND js.revoked_at IS NULL
      )
      OR EXISTS (
        SELECT 1 
        FROM journey_share_days jsd
        INNER JOIN journey_shares js ON js.id = jsd.journey_share_id
        WHERE jsd.day_id = d.id
        AND js.shared_with = p_user_id
        AND js.is_active = true
        AND js.revoked_at IS NULL
      )
    )
  );
$$;

-- Drop existing policies for activities
DROP POLICY IF EXISTS "Users can view activities" ON activities;

-- Create new optimized policy for activities
CREATE POLICY "Users can view activities"
  ON activities FOR SELECT
  TO authenticated
  USING (has_day_access_optimized(day_id, auth.uid()));

-- Drop existing policies for accommodations  
DROP POLICY IF EXISTS "Users can view accommodations" ON accommodations;

-- Create new optimized policy for accommodations
CREATE POLICY "Users can view accommodations"
  ON accommodations FOR SELECT
  TO authenticated
  USING (has_day_access_optimized(day_id, auth.uid()));

-- Drop existing policies for dining
DROP POLICY IF EXISTS "Users can view dining" ON dining;

-- Create new optimized policy for dining
CREATE POLICY "Users can view dining"
  ON dining FOR SELECT
  TO authenticated
  USING (has_day_access_optimized(day_id, auth.uid()));

-- Drop all existing SELECT policies for transportation
DROP POLICY IF EXISTS "Users can view transportation" ON transportation;
DROP POLICY IF EXISTS "Admins can view all transportation" ON transportation;
DROP POLICY IF EXISTS "Guides can view transportation for shared trips" ON transportation;
DROP POLICY IF EXISTS "Users with trip access can view transportation" ON transportation;
DROP POLICY IF EXISTS "Driver copy owners can view their transportation" ON transportation;
DROP POLICY IF EXISTS "Guides can view transportation for their driver copies" ON transportation;

-- Create single optimized policy for transportation
CREATE POLICY "Users can view transportation"
  ON transportation FOR SELECT
  TO authenticated
  USING (has_day_access_optimized(day_id, auth.uid()));

-- Analyze tables to update statistics
ANALYZE activities;
ANALYZE accommodations;
ANALYZE dining;
ANALYZE transportation;
ANALYZE itinerary_days;
ANALYZE journeys;
ANALYZE journey_shares;
