/*
  # Update get_shareable_guides to Include All Users and Staff

  ## Changes
  Updates the `get_shareable_guides()` function to return:
  1. All active guide users (from users table)
  2. All active guide staff (from master_staff table)
  3. All active driver users (from users table)
  4. All active manager users (from users table)
  
  This allows sharing journeys with any user or staff member in the system.

  ## Details
  - Returns unified list with consistent structure
  - Marks entries from users table with source indicator
  - Prioritizes active status
  - Orders by name for easy selection
*/

-- Drop existing function first
DROP FUNCTION IF EXISTS get_shareable_guides();

-- Create updated helper function to get all shareable users and guides
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
    u.phone,
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
    u.phone,
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
    u.phone,
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