/*
  # Fix Master Staff Status Sync and Add Guide Self-Access

  1. Changes
    - Fix sync logic to use status='active' instead of 'approved'
    - Update backfill logic to match
    - Add RLS policies for guides to view and edit their own master_staff record

  2. New Policies
    - Guides can view their own linked master_staff record
    - Guides can update their own linked master_staff record
    - This allows guides to manage their own profile, documents, and information

  3. Security
    - Guides can only access their own master_staff record via user_id match
    - All other RLS policies remain unchanged
*/

-- Update the sync function to use status='active'
CREATE OR REPLACE FUNCTION sync_master_staff_with_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only sync if the user is a guide and has a linked master_staff record
  IF NEW.role = 'guide' THEN
    UPDATE master_staff
    SET 
      name = NEW.name,
      email = NEW.email,
      phone = NEW.phone_number,
      is_active = CASE 
        WHEN NEW.status = 'active' AND NEW.deleted_at IS NULL THEN true 
        ELSE false 
      END,
      updated_at = now()
    WHERE user_id = NEW.id;
    
    -- If no master_staff record exists, create one
    IF NOT FOUND THEN
      INSERT INTO master_staff (
        user_id,
        name,
        email,
        phone,
        role,
        staff_type,
        availability,
        is_active
      ) VALUES (
        NEW.id,
        NEW.name,
        NEW.email,
        NEW.phone_number,
        'guide',
        'employee',
        'available',
        CASE WHEN NEW.status = 'active' AND NEW.deleted_at IS NULL THEN true ELSE false END
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the create function to use status='active'
CREATE OR REPLACE FUNCTION create_master_staff_for_guide()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create master_staff for guide users
  IF NEW.role = 'guide' THEN
    INSERT INTO master_staff (
      user_id,
      name,
      email,
      phone,
      role,
      staff_type,
      availability,
      is_active
    ) VALUES (
      NEW.id,
      NEW.name,
      NEW.email,
      NEW.phone_number,
      'guide',
      'employee',
      'available',
      CASE WHEN NEW.status = 'active' AND NEW.deleted_at IS NULL THEN true ELSE false END
    )
    ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicates if record already exists
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update existing master_staff records to reflect correct status
UPDATE master_staff ms
SET is_active = CASE 
  WHEN u.status = 'active' AND u.deleted_at IS NULL THEN true 
  ELSE false 
END
FROM users u
WHERE ms.user_id = u.id
AND u.role = 'guide';

-- Add RLS policy: Guides can view their own master_staff record
CREATE POLICY "Guides can view own master_staff record"
  ON master_staff
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'guide'
    )
  );

-- Add RLS policy: Guides can update their own master_staff record
CREATE POLICY "Guides can update own master_staff record"
  ON master_staff
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'guide'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'guide'
    )
  );
