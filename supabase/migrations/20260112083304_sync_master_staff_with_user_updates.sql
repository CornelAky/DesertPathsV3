/*
  # Sync Master Staff with User Profile Updates

  1. Changes
    - Create trigger function to update master_staff when linked user profile is updated
    - Create trigger to call the function on user update
    - Handle status changes (deactivate staff when user is not approved)

  2. What gets synced
    - Name changes in user profile → master_staff name
    - Email changes in user profile → master_staff email
    - Phone changes in user profile → master_staff phone
    - User status changes → master_staff is_active flag
      - approved user → active staff
      - pending/rejected/deleted user → inactive staff

  3. Security
    - Trigger runs with SECURITY DEFINER to bypass RLS during auto-sync
*/

-- Create function to sync master_staff when user profile is updated
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
        WHEN NEW.status = 'approved' AND NEW.deleted_at IS NULL THEN true 
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
        CASE WHEN NEW.status = 'approved' AND NEW.deleted_at IS NULL THEN true ELSE false END
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync master_staff when user is updated
DROP TRIGGER IF EXISTS trigger_sync_master_staff_with_user ON users;
CREATE TRIGGER trigger_sync_master_staff_with_user
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone_number IS DISTINCT FROM NEW.phone_number OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
  )
  EXECUTE FUNCTION sync_master_staff_with_user();
