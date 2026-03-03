/*
  # Auto-Create Master Staff for Guide Users

  1. Changes
    - Add `user_id` column to `master_staff` table to link staff records to user accounts
    - Add unique constraint on `user_id` to prevent duplicate staff records per user
    - Create trigger function to automatically create master_staff record when guide user is created
    - Create trigger to call the function on user insert

  2. How it works
    - When a new user with role='guide' is created, a corresponding master_staff record is automatically created
    - The master_staff record links back to the user via user_id
    - Staff data is synced from user profile (name, email, phone)
    - This ensures all guides are available in the master staff list for assignment

  3. Security
    - No changes to RLS policies needed
    - Trigger runs with SECURITY DEFINER to bypass RLS during auto-creation
*/

-- Add user_id column to master_staff table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_staff' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE master_staff ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add unique constraint on user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'master_staff_user_id_unique'
  ) THEN
    ALTER TABLE master_staff ADD CONSTRAINT master_staff_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_master_staff_user_id ON master_staff(user_id);

-- Create function to auto-create master_staff for guide users
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
      true
    )
    ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicates if record already exists
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create master_staff when guide user is created
DROP TRIGGER IF EXISTS trigger_create_master_staff_for_guide ON users;
CREATE TRIGGER trigger_create_master_staff_for_guide
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_master_staff_for_guide();

-- Backfill: Create master_staff records for existing guide users who don't have one
INSERT INTO master_staff (
  user_id,
  name,
  email,
  phone,
  role,
  staff_type,
  availability,
  is_active
)
SELECT 
  u.id,
  u.name,
  u.email,
  u.phone_number,
  'guide',
  'employee',
  'available',
  CASE WHEN u.status = 'approved' THEN true ELSE false END
FROM users u
LEFT JOIN master_staff ms ON ms.user_id = u.id
WHERE u.role = 'guide' AND ms.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
