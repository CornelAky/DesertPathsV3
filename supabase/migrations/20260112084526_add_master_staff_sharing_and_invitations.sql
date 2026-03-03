/*
  # Add Master Staff Sharing and Manual Invitations

  1. Changes to journey_shares
    - Add master_staff_id to allow sharing with guides from master_staff (even without user accounts)
    - Make shared_with nullable (can be null if sharing via master_staff_id instead)
    - Add invitation_status to track invitation state ('pending', 'sent', 'accepted', 'not_needed')
    - Add invitation_sent_at to track when invitation was sent
    - Add constraint: must have either shared_with OR master_staff_id (not both, not neither)

  2. Updated RLS Functions
    - Update has_journey_access to check master_staff_id linked to user_id
    - Update has_day_access to check master_staff_id linked to user_id
    - Guides can see journeys/days shared with their master_staff record

  3. Invitation System
    - invitation_status tracks the state of invitations
    - invitation_sent_at tracks when invites were manually sent
    - Admins can manually trigger sending invitations via UI button

  4. Security
    - RLS policies updated to support master_staff-based sharing
    - Only admins can create/update/delete shares
    - Guides linked to master_staff can view shared content
*/

-- Make shared_with nullable in journey_shares
ALTER TABLE journey_shares 
  ALTER COLUMN shared_with DROP NOT NULL;

-- Add new columns to journey_shares
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journey_shares' AND column_name = 'master_staff_id'
  ) THEN
    ALTER TABLE journey_shares 
      ADD COLUMN master_staff_id uuid REFERENCES master_staff(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journey_shares' AND column_name = 'invitation_status'
  ) THEN
    ALTER TABLE journey_shares 
      ADD COLUMN invitation_status text DEFAULT 'not_needed' 
      CHECK (invitation_status IN ('pending', 'sent', 'accepted', 'not_needed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journey_shares' AND column_name = 'invitation_sent_at'
  ) THEN
    ALTER TABLE journey_shares 
      ADD COLUMN invitation_sent_at timestamptz;
  END IF;
END $$;

-- Add constraint: must have either shared_with OR master_staff_id (not both, not neither)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'journey_shares_must_have_recipient'
  ) THEN
    ALTER TABLE journey_shares 
      ADD CONSTRAINT journey_shares_must_have_recipient 
      CHECK (
        (shared_with IS NOT NULL AND master_staff_id IS NULL) OR
        (shared_with IS NULL AND master_staff_id IS NOT NULL)
      );
  END IF;
END $$;

-- Create index for master_staff_id lookups
CREATE INDEX IF NOT EXISTS idx_journey_shares_master_staff 
  ON journey_shares(master_staff_id, is_active) WHERE master_staff_id IS NOT NULL;

-- Update has_journey_access function to support master_staff sharing
CREATE OR REPLACE FUNCTION has_journey_access(p_journey_id uuid, p_user_id uuid, required_permission text DEFAULT 'view')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Check if user is the creator
  IF EXISTS (
    SELECT 1 FROM journeys
    WHERE id = p_journey_id
    AND created_by = p_user_id
  ) THEN
    RETURN true;
  END IF;

  -- Check if user has direct share access (via user account)
  IF EXISTS (
    SELECT 1 FROM journey_shares
    WHERE journey_id = p_journey_id
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

  -- Check if user has access via master_staff link
  IF EXISTS (
    SELECT 1 FROM journey_shares js
    INNER JOIN master_staff ms ON js.master_staff_id = ms.id
    WHERE js.journey_id = p_journey_id
    AND ms.user_id = p_user_id
    AND js.is_active = true
    AND js.revoked_at IS NULL
    AND (
      required_permission = 'view'
      OR (required_permission = 'edit' AND js.permission_level = 'edit')
    )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Update has_day_access function to support master_staff sharing
CREATE OR REPLACE FUNCTION has_day_access(p_day_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_role text;
  v_journey_id uuid;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM users
  WHERE id = p_user_id;

  -- Admins have full access
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Get journey_id for the day
  SELECT journey_id INTO v_journey_id
  FROM itinerary_days
  WHERE id = p_day_id;

  -- Check if user is the creator
  IF EXISTS (
    SELECT 1 FROM journeys
    WHERE id = v_journey_id
    AND created_by = p_user_id
  ) THEN
    RETURN true;
  END IF;

  -- Check if user has a journey share (via user account)
  IF EXISTS (
    SELECT 1 FROM journey_shares
    WHERE journey_id = v_journey_id
    AND shared_with = p_user_id
    AND is_active = true
    AND revoked_at IS NULL
    AND (
      share_all_days = true
      OR EXISTS (
        SELECT 1 FROM journey_share_days
        WHERE journey_share_days.journey_share_id = journey_shares.id
        AND journey_share_days.day_id = p_day_id
      )
    )
  ) THEN
    RETURN true;
  END IF;

  -- Check if user has access via master_staff link
  IF EXISTS (
    SELECT 1 FROM journey_shares js
    INNER JOIN master_staff ms ON js.master_staff_id = ms.id
    WHERE js.journey_id = v_journey_id
    AND ms.user_id = p_user_id
    AND js.is_active = true
    AND js.revoked_at IS NULL
    AND (
      js.share_all_days = true
      OR EXISTS (
        SELECT 1 FROM journey_share_days jsd
        WHERE jsd.journey_share_id = js.id
        AND jsd.day_id = p_day_id
      )
    )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Drop and recreate the unique constraint to include master_staff_id
ALTER TABLE journey_shares DROP CONSTRAINT IF EXISTS journey_shares_journey_id_shared_with_key;

-- Create new unique constraint that handles both user and staff sharing
CREATE UNIQUE INDEX IF NOT EXISTS journey_shares_journey_user_unique 
  ON journey_shares(journey_id, shared_with) 
  WHERE shared_with IS NOT NULL AND master_staff_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS journey_shares_journey_staff_unique 
  ON journey_shares(journey_id, master_staff_id) 
  WHERE master_staff_id IS NOT NULL AND shared_with IS NULL;

-- Update RLS policies for journey_shares to include master_staff access

DROP POLICY IF EXISTS "Admins and shared users can view journey shares" ON journey_shares;
CREATE POLICY "Admins and shared users can view journey shares"
  ON journey_shares FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR shared_by = auth.uid()
    OR shared_with = auth.uid()
    OR EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.id = journey_shares.master_staff_id
      AND master_staff.user_id = auth.uid()
    )
  );

-- Function to auto-update invitation status when user account is created
CREATE OR REPLACE FUNCTION update_invitation_status_on_user_link()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a master_staff gets linked to a user_id, update related journey_shares
  IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD.user_id != NEW.user_id) THEN
    UPDATE journey_shares
    SET invitation_status = 'accepted'
    WHERE master_staff_id = NEW.id
    AND invitation_status IN ('pending', 'sent');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-updating invitation status
DROP TRIGGER IF EXISTS update_invitation_status_trigger ON master_staff;
CREATE TRIGGER update_invitation_status_trigger
  AFTER UPDATE ON master_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_status_on_user_link();

-- Create helper function to get guides for sharing (includes those without user accounts)
CREATE OR REPLACE FUNCTION get_shareable_guides()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  has_user_account boolean,
  user_id uuid,
  availability text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.id,
    ms.name,
    ms.email,
    ms.phone,
    (ms.user_id IS NOT NULL) as has_user_account,
    ms.user_id,
    ms.availability,
    ms.is_active
  FROM master_staff ms
  WHERE ms.role = 'guide'
  AND ms.is_active = true
  ORDER BY ms.name;
END;
$$;
