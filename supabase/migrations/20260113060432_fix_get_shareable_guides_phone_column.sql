/*
  # Fix get_shareable_guides Phone Column Reference

  ## Changes
  Fixes the `get_shareable_guides()` function to correctly reference the phone_number column
  from the users table (not phone).

  ## Details
  - Users table has `phone_number` column
  - Master_staff table has `phone` column
  - Function was incorrectly using `u.phone` causing query failures
*/

-- Drop and recreate the function with correct column reference
DROP FUNCTION IF EXISTS get_shareable_guides();

CREATE OR REPLACE FUNCTION get_shareable_guides()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  has_user_account boolean,
  user_id uuid,
  availability text,
  is_active boolean,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  -- Get all master_staff guides
  SELECT
    ms.id,
    ms.name,
    ms.email,
    ms.phone,
    (ms.user_id IS NOT NULL) as has_user_account,
    ms.user_id,
    ms.availability,
    ms.is_active,
    'staff'::text as source
  FROM master_staff ms
  WHERE ms.role = 'guide'
  AND ms.is_active = true

  UNION ALL

  -- Get all active users with guide role who are NOT already in master_staff
  SELECT
    u.id,
    u.name,
    u.email,
    u.phone_number as phone,
    true as has_user_account,
    u.id as user_id,
    CASE
      WHEN u.status = 'active' THEN 'available'
      ELSE 'unavailable'
    END as availability,
    (u.status = 'active' AND u.deleted_at IS NULL) as is_active,
    'user'::text as source
  FROM users u
  WHERE u.role = 'guide'
  AND u.status = 'active'
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM master_staff ms2
    WHERE ms2.user_id = u.id
  )

  UNION ALL

  -- Get all active users with driver role who are NOT already in master_staff
  SELECT
    u.id,
    u.name,
    u.email,
    u.phone_number as phone,
    true as has_user_account,
    u.id as user_id,
    CASE
      WHEN u.status = 'active' THEN 'available'
      ELSE 'unavailable'
    END as availability,
    (u.status = 'active' AND u.deleted_at IS NULL) as is_active,
    'user'::text as source
  FROM users u
  WHERE u.role = 'driver'
  AND u.status = 'active'
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM master_staff ms2
    WHERE ms2.user_id = u.id
  )

  UNION ALL

  -- Get all active users with manager role who are NOT already in master_staff
  SELECT
    u.id,
    u.name,
    u.email,
    u.phone_number as phone,
    true as has_user_account,
    u.id as user_id,
    CASE
      WHEN u.status = 'active' THEN 'available'
      ELSE 'unavailable'
    END as availability,
    (u.status = 'active' AND u.deleted_at IS NULL) as is_active,
    'user'::text as source
  FROM users u
  WHERE u.role = 'manager'
  AND u.status = 'active'
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM master_staff ms2
    WHERE ms2.user_id = u.id
  )

  ORDER BY name;
END;
$$;