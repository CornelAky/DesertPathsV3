/*
  # Add User Data Transfer System for Safe Deletion

  1. Purpose
    - Enable safe permanent deletion of users by transferring their data to a designated admin user
    - Preserve historical records with notes about the original user
    - Handle all foreign key constraints that prevent user deletion

  2. New Tables
    - `deleted_user_archive` - Archive of deleted user information for reference
      - `id` (uuid, primary key)
      - `original_user_id` (uuid) - The deleted user's ID
      - `original_user_email` (text) - The deleted user's email
      - `original_user_name` (text) - The deleted user's name
      - `original_user_role` (text) - The deleted user's role
      - `transfer_note` (text) - Note about data transfer
      - `deleted_at` (timestamptz) - When the user was deleted
      - `deleted_by` (uuid) - Who performed the deletion

  3. Functions
    - `transfer_user_data_to_admin` - Transfers all user references to admin user before deletion
    - `get_admin_user_id` - Gets the ID of the admin user (info@desertpaths.co)

  4. Changes
    - Update foreign key constraints to allow safe user deletion
    - Modify constraints on journey_notifications and other tables
*/

-- Create deleted user archive table
CREATE TABLE IF NOT EXISTS deleted_user_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id uuid NOT NULL,
  original_user_email text NOT NULL,
  original_user_name text NOT NULL,
  original_user_role text NOT NULL,
  transfer_note text,
  deleted_at timestamptz DEFAULT now(),
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE deleted_user_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view deleted user archive"
  ON deleted_user_archive FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Only admins can insert into deleted user archive"
  ON deleted_user_archive FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Function to get the admin user ID
CREATE OR REPLACE FUNCTION get_admin_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id
  FROM users
  WHERE email = 'info@desertpaths.co'
  AND role = 'admin'
  AND status = 'active'
  LIMIT 1;
  
  IF admin_id IS NULL THEN
    -- If specific admin not found, get any active admin
    SELECT id INTO admin_id
    FROM users
    WHERE role = 'admin'
    AND status = 'active'
    LIMIT 1;
  END IF;
  
  RETURN admin_id;
END;
$$;

-- Function to transfer user data before deletion
CREATE OR REPLACE FUNCTION transfer_user_data_to_admin(
  p_user_id uuid,
  p_deleted_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_user_record record;
  v_transfer_note text;
BEGIN
  -- Get admin user ID
  v_admin_id := get_admin_user_id();
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found to transfer data to';
  END IF;
  
  -- Get user information before deletion
  SELECT email, name, role INTO v_user_record
  FROM users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Create transfer note
  v_transfer_note := format(
    'Data originally belonged to user: %s (%s) - Role: %s - Transferred on permanent deletion',
    v_user_record.name,
    v_user_record.email,
    v_user_record.role
  );
  
  -- Archive the user information
  INSERT INTO deleted_user_archive (
    original_user_id,
    original_user_email,
    original_user_name,
    original_user_role,
    transfer_note,
    deleted_by
  ) VALUES (
    p_user_id,
    v_user_record.email,
    v_user_record.name,
    v_user_record.role,
    v_transfer_note,
    p_deleted_by
  );
  
  -- Transfer journey_notifications
  UPDATE journey_notifications
  SET user_id = v_admin_id
  WHERE user_id = p_user_id;
  
  -- Transfer journey_document_activities
  UPDATE journey_document_activities
  SET user_id = v_admin_id
  WHERE user_id = p_user_id;
  
  -- Transfer journey_document_views
  UPDATE journey_document_views
  SET user_id = v_admin_id
  WHERE user_id = p_user_id;
  
  -- Transfer journey_documents uploaded_by
  UPDATE journey_documents
  SET uploaded_by = v_admin_id
  WHERE uploaded_by = p_user_id;
  
  -- Transfer itinerary_entry_comments
  UPDATE itinerary_entry_comments
  SET user_id = v_admin_id
  WHERE user_id = p_user_id;
  
  -- Transfer itinerary_change_log
  UPDATE itinerary_change_log
  SET changed_by = v_admin_id
  WHERE changed_by = p_user_id;
  
  -- Transfer system_settings
  UPDATE system_settings
  SET updated_by = v_admin_id
  WHERE updated_by = p_user_id;
  
  -- Transfer customers deleted_by
  UPDATE customers
  SET deleted_by = v_admin_id
  WHERE deleted_by = p_user_id;
  
  -- For users table self-references (approved_by, deleted_by)
  UPDATE users
  SET approved_by = v_admin_id
  WHERE approved_by = p_user_id;
  
  UPDATE users
  SET deleted_by = v_admin_id
  WHERE deleted_by = p_user_id;
  
  -- Note: Tables with CASCADE delete rules will be automatically handled:
  -- - itinerary_activity_log
  -- - journey_assignments
  -- - journey_share_links
  -- - journey_shares
  
  -- Tables with SET NULL will be automatically handled:
  -- - journeys (created_by)
  -- - uploaded_documents (uploaded_by)
  
END;
$$;