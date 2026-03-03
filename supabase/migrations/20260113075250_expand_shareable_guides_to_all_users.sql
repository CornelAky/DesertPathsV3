/*
  # Expand get_shareable_guides to Include All Active Users

  ## Changes
  Updates the `get_shareable_guides()` function to return all active users regardless of role,
  making it possible to share journeys with any staff member or user in the system.

  ## Details
  - Returns all active master_staff entries (all roles)
  - Returns all active users (all roles) who are not already in master_staff
  - Maintains the same return structure
*/

-- Drop and recreate the function to include all users
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
  -- Get all active master_staff (all roles)
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
  WHERE ms.is_active = true

  UNION ALL

  -- Get all active users who are NOT already in master_staff
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
  WHERE u.status = 'active'
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM master_staff ms2
    WHERE ms2.user_id = u.id
  )

  ORDER BY name;
END;
$$;