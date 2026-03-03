/*
  # Fix Journey RLS with Proper SECURITY DEFINER Configuration

  1. Problem
    - Functions still causing infinite recursion even with SECURITY DEFINER
    - Need to add SET search_path to ensure functions truly bypass RLS

  2. Solution
    - Update helper functions to include SET search_path = 'public'
    - This ensures the function executes with definer's privileges, not invoker's
    - Prevents RLS from applying within the function

  3. Changes
    - Add SET search_path to can_view_journey
    - Add SET search_path to can_edit_journey
    - Add SET search_path to is_admin, user_has_role, is_users_guide_copy
*/

-- Fix can_view_journey with proper security settings
CREATE OR REPLACE FUNCTION public.can_view_journey(journey_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role text;
  user_id_param uuid;
BEGIN
  user_id_param := auth.uid();
  
  -- No user authenticated
  IF user_id_param IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user role
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id_param
    AND status = 'active'
    AND deleted_at IS NULL;
  
  -- Admins can see everything
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user is the creator
  IF EXISTS (
    SELECT 1 FROM journeys
    WHERE id = journey_id_param
      AND created_by = user_id_param
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if journey is shared with user directly
  IF EXISTS (
    SELECT 1 FROM journey_shares
    WHERE journey_id = journey_id_param
      AND shared_with = user_id_param
      AND is_active = true
      AND revoked_at IS NULL
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if journey is shared with user via master_staff
  IF EXISTS (
    SELECT 1 FROM journey_shares js
    INNER JOIN master_staff ms ON js.master_staff_id = ms.id
    WHERE js.journey_id = journey_id_param
      AND ms.user_id = user_id_param
      AND js.is_active = true
      AND js.revoked_at IS NULL
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned as staff on this journey
  IF EXISTS (
    SELECT 1 FROM journey_staff jstaff
    INNER JOIN master_staff ms ON jstaff.master_staff_id = ms.id
    WHERE jstaff.journey_id = journey_id_param
      AND ms.user_id = user_id_param
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Fix can_edit_journey with proper security settings
CREATE OR REPLACE FUNCTION public.can_edit_journey(journey_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role text;
  user_id_param uuid;
BEGIN
  user_id_param := auth.uid();
  
  -- No user authenticated
  IF user_id_param IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user role
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id_param
    AND status = 'active'
    AND deleted_at IS NULL;
  
  -- Admins can edit everything
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user is the creator
  IF EXISTS (
    SELECT 1 FROM journeys
    WHERE id = journey_id_param
      AND created_by = user_id_param
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if journey is shared with edit permission (user directly)
  IF EXISTS (
    SELECT 1 FROM journey_shares
    WHERE journey_id = journey_id_param
      AND shared_with = user_id_param
      AND is_active = true
      AND revoked_at IS NULL
      AND permission_level = 'edit'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if journey is shared with edit permission (via master_staff)
  IF EXISTS (
    SELECT 1 FROM journey_shares js
    INNER JOIN master_staff ms ON js.master_staff_id = ms.id
    WHERE js.journey_id = journey_id_param
      AND ms.user_id = user_id_param
      AND js.is_active = true
      AND js.revoked_at IS NULL
      AND js.permission_level = 'edit'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Fix is_admin with proper security settings
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  SELECT (role = 'admin' AND status = 'active' AND deleted_at IS NULL)
  INTO is_admin_user
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin_user, false);
END;
$$;

-- Fix user_has_role with proper security settings
CREATE OR REPLACE FUNCTION public.user_has_role(check_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role
  FROM users
  WHERE id = auth.uid()
    AND status = 'active'
    AND deleted_at IS NULL;
  
  RETURN current_role = check_role;
END;
$$;

-- Fix is_users_guide_copy with proper security settings
CREATE OR REPLACE FUNCTION public.is_users_guide_copy(trip_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM journeys
    WHERE journeys.id = trip_id_param
      AND journeys.created_by = auth.uid()
      AND journeys.is_driver_copy = true
  );
END;
$$;