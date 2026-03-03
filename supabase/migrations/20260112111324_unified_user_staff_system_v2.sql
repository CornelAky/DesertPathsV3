/*
  # Unified User and Staff Management System
  
  1. Changes to master_staff table
    - Add `category` field for staff categorization (guide, driver, coordinator, etc.)
    - Add `subcategory` field for custom subcategorization
    - Add `user_id` column if not exists (links to users table)
    - Add `status` field to track staff status ('active', 'inactive', 'on_leave', 'terminated')
    
  2. New Tables
    - `staff_documents` - Multiple documents per staff member
      - `id`, `master_staff_id`, `document_type`, `document_name`, `file_url`, `uploaded_at`
    
    - `staff_images` - Multiple images per staff member
      - `id`, `master_staff_id`, `image_type`, `image_name`, `file_url`, `uploaded_at`
  
  3. Changes to users table
    - Add `is_staff_member` boolean to indicate if user has master_staff record
    
  4. Changes to journey_staff table
    - Ensure `master_staff_id` exists and is required
    - Remove duplicate fields that can be pulled from master_staff
    - Keep only journey-specific data
  
  5. Security
    - Enable RLS on new tables
    - Add policies for admins and linked users to manage documents/images
    - Update existing policies to support new structure
  
  6. Triggers
    - Bidirectional sync between users and master_staff
    - Auto-create master_staff when user is created with is_staff_member=true
*/

-- Add new columns to master_staff
DO $$
BEGIN
  -- Add category column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_staff' AND column_name = 'category'
  ) THEN
    ALTER TABLE master_staff ADD COLUMN category text NOT NULL DEFAULT 'guide';
  END IF;
  
  -- Add subcategory column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_staff' AND column_name = 'subcategory'
  ) THEN
    ALTER TABLE master_staff ADD COLUMN subcategory text;
  END IF;
  
  -- Add status column (replaces is_active in a more detailed way)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_staff' AND column_name = 'status'
  ) THEN
    ALTER TABLE master_staff ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;
  
  -- Ensure user_id exists (it should from previous migration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_staff' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE master_staff ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_master_staff_user_id ON master_staff(user_id);
  END IF;
END $$;

-- Create unique constraint on user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'master_staff_user_id_unique'
  ) THEN
    ALTER TABLE master_staff ADD CONSTRAINT master_staff_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_master_staff_category ON master_staff(category);
CREATE INDEX IF NOT EXISTS idx_master_staff_status ON master_staff(status);

-- Create staff_documents table
CREATE TABLE IF NOT EXISTS staff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_staff_id uuid NOT NULL REFERENCES master_staff(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now(),
  notes text DEFAULT ''
);

-- Create staff_images table
CREATE TABLE IF NOT EXISTS staff_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_staff_id uuid NOT NULL REFERENCES master_staff(id) ON DELETE CASCADE,
  image_type text NOT NULL DEFAULT 'other',
  image_name text NOT NULL,
  file_url text NOT NULL,
  is_primary boolean DEFAULT false,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now(),
  notes text DEFAULT ''
);

-- Enable RLS
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_images ENABLE ROW LEVEL SECURITY;

-- Policies for staff_documents
CREATE POLICY "Authenticated users can view staff documents"
  ON staff_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert staff documents"
  ON staff_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can insert their own documents"
  ON staff_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.id = master_staff_id
      AND master_staff.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can update staff documents"
  ON staff_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can update their own documents"
  ON staff_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.id = master_staff_id
      AND master_staff.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can delete staff documents"
  ON staff_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can delete their own documents"
  ON staff_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.id = master_staff_id
      AND master_staff.user_id = auth.uid()
    )
  );

-- Policies for staff_images (same as documents)
CREATE POLICY "Authenticated users can view staff images"
  ON staff_images FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert staff images"
  ON staff_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can insert their own images"
  ON staff_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.id = master_staff_id
      AND master_staff.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can update staff images"
  ON staff_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can update their own images"
  ON staff_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.id = master_staff_id
      AND master_staff.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can delete staff images"
  ON staff_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can delete their own images"
  ON staff_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_staff
      WHERE master_staff.id = master_staff_id
      AND master_staff.user_id = auth.uid()
    )
  );

-- Add is_staff_member to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_staff_member'
  ) THEN
    ALTER TABLE users ADD COLUMN is_staff_member boolean DEFAULT false;
  END IF;
END $$;

-- Update is_staff_member for existing users who have master_staff records
UPDATE users SET is_staff_member = true
WHERE id IN (
  SELECT user_id FROM master_staff WHERE user_id IS NOT NULL
);

-- Add master_staff_id to journey_staff if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journey_staff' AND column_name = 'master_staff_id'
  ) THEN
    ALTER TABLE journey_staff ADD COLUMN master_staff_id uuid REFERENCES master_staff(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_journey_staff_master_staff_id ON journey_staff(master_staff_id);

-- Update policies for master_staff to allow staff to view/edit their own records
DROP POLICY IF EXISTS "Staff can view their own record" ON master_staff;
CREATE POLICY "Staff can view their own record"
  ON master_staff FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can update their own record" ON master_staff;
CREATE POLICY "Staff can update their own record"
  ON master_staff FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create or replace function to sync users and master_staff (bidirectional)
CREATE OR REPLACE FUNCTION sync_user_and_master_staff()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- When user is updated, sync to master_staff
  IF TG_TABLE_NAME = 'users' THEN
    -- Only sync if user has is_staff_member = true and has a linked master_staff
    IF NEW.is_staff_member = true THEN
      UPDATE master_staff
      SET 
        name = NEW.name,
        email = NEW.email,
        phone = COALESCE(NEW.phone_number, master_staff.phone),
        profile_photo_url = COALESCE(NEW.profile_picture_url, master_staff.profile_photo_url),
        status = CASE 
          WHEN NEW.status = 'approved' AND NEW.deleted_at IS NULL THEN 'active'
          WHEN NEW.deleted_at IS NOT NULL THEN 'terminated'
          ELSE 'inactive'
        END,
        updated_at = now()
      WHERE user_id = NEW.id;
    END IF;
  END IF;
  
  -- When master_staff is updated, sync to users
  IF TG_TABLE_NAME = 'master_staff' THEN
    -- Only sync if master_staff has a linked user
    IF NEW.user_id IS NOT NULL THEN
      UPDATE users
      SET 
        name = NEW.name,
        email = NEW.email,
        phone_number = COALESCE(NEW.phone, users.phone_number),
        updated_at = now()
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS trigger_sync_master_staff_with_user ON users;
DROP TRIGGER IF EXISTS trigger_sync_user_with_master_staff ON master_staff;
DROP TRIGGER IF EXISTS trigger_sync_user_to_master_staff ON users;
DROP TRIGGER IF EXISTS trigger_sync_master_staff_to_user ON master_staff;

-- Create trigger on users table
CREATE TRIGGER trigger_sync_user_to_master_staff
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone_number IS DISTINCT FROM NEW.phone_number OR
    OLD.profile_picture_url IS DISTINCT FROM NEW.profile_picture_url OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
  )
  EXECUTE FUNCTION sync_user_and_master_staff();

-- Create trigger on master_staff table
CREATE TRIGGER trigger_sync_master_staff_to_user
  AFTER UPDATE ON master_staff
  FOR EACH ROW
  WHEN (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone IS DISTINCT FROM NEW.phone
  )
  EXECUTE FUNCTION sync_user_and_master_staff();

-- Create or replace function to auto-create master_staff when user is created with is_staff_member=true
CREATE OR REPLACE FUNCTION auto_create_master_staff_for_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create master_staff if is_staff_member = true
  IF NEW.is_staff_member = true THEN
    INSERT INTO master_staff (
      user_id,
      name,
      email,
      phone,
      role,
      category,
      staff_type,
      availability,
      status,
      profile_photo_url
    ) VALUES (
      NEW.id,
      NEW.name,
      NEW.email,
      NEW.phone_number,
      CASE WHEN NEW.role = 'guide' THEN 'guide' ELSE 'other' END,
      CASE WHEN NEW.role = 'guide' THEN 'guide' ELSE 'other' END,
      'employee',
      'available',
      CASE WHEN NEW.status = 'approved' THEN 'active' ELSE 'inactive' END,
      NEW.profile_picture_url
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_create_master_staff_for_guide ON users;
DROP TRIGGER IF EXISTS trigger_auto_create_master_staff_for_user ON users;

-- Create new trigger on user insert
CREATE TRIGGER trigger_auto_create_master_staff_for_user
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.is_staff_member = true)
  EXECUTE FUNCTION auto_create_master_staff_for_user();

-- Add indexes for faster lookups on new tables
CREATE INDEX IF NOT EXISTS idx_staff_documents_master_staff_id ON staff_documents(master_staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_document_type ON staff_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_staff_images_master_staff_id ON staff_images(master_staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_images_is_primary ON staff_images(is_primary);
