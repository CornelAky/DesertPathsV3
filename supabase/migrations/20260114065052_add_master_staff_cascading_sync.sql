/*
  # Cascading Updates and Deletes for Master Staff

  1. New Triggers
    - `sync_master_staff_to_journey_staff` - When master_staff is updated, sync changes to all related journey_staff entries
    - `cascade_delete_journey_staff` - When master_staff is deleted, cascade delete to journey_staff
    - `cascade_delete_day_assignments` - When journey_staff is deleted, cascade delete to journey_staff_day_assignments

  2. Synced Fields
    - name
    - email
    - phone
    - emergency_contact
    - role (from category)
    - role_custom (from subcategory)
    - staff_type
    - status
    - availability
    - availability_notes
    - profile_photo_url
    - has_vehicle
    - vehicle_type
    - internal_notes

  3. Important Notes
    - Journey-specific fields (payment info, documents) are NOT synced
    - Deletes cascade to maintain referential integrity
    - Updates happen automatically in real-time
*/

-- Function to sync master_staff updates to journey_staff
CREATE OR REPLACE FUNCTION sync_master_staff_to_journey_staff()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all journey_staff entries that reference this master_staff
  UPDATE journey_staff
  SET
    name = NEW.name,
    email = NEW.email,
    phone = NEW.phone,
    emergency_contact = NEW.emergency_contact,
    role = NEW.category::staff_role,
    role_custom = NEW.subcategory,
    staff_type = NEW.staff_type::staff_type,
    status = NEW.status::staff_status,
    availability = NEW.availability::availability_status,
    availability_notes = NEW.availability_notes,
    profile_photo_url = NEW.profile_photo_url,
    has_vehicle = NEW.has_vehicle,
    vehicle_type = NEW.vehicle_type,
    internal_notes = NEW.internal_notes,
    updated_at = now()
  WHERE master_staff_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync on master_staff update
DROP TRIGGER IF EXISTS trigger_sync_master_staff_to_journey_staff ON master_staff;
CREATE TRIGGER trigger_sync_master_staff_to_journey_staff
  AFTER UPDATE ON master_staff
  FOR EACH ROW
  WHEN (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.emergency_contact IS DISTINCT FROM NEW.emergency_contact OR
    OLD.category IS DISTINCT FROM NEW.category OR
    OLD.subcategory IS DISTINCT FROM NEW.subcategory OR
    OLD.staff_type IS DISTINCT FROM NEW.staff_type OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.availability IS DISTINCT FROM NEW.availability OR
    OLD.availability_notes IS DISTINCT FROM NEW.availability_notes OR
    OLD.profile_photo_url IS DISTINCT FROM NEW.profile_photo_url OR
    OLD.has_vehicle IS DISTINCT FROM NEW.has_vehicle OR
    OLD.vehicle_type IS DISTINCT FROM NEW.vehicle_type OR
    OLD.internal_notes IS DISTINCT FROM NEW.internal_notes
  )
  EXECUTE FUNCTION sync_master_staff_to_journey_staff();

-- Function to cascade delete journey_staff when master_staff is deleted
CREATE OR REPLACE FUNCTION cascade_delete_journey_staff()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all journey_staff entries that reference this master_staff
  -- This will also trigger cascade to journey_staff_day_assignments
  DELETE FROM journey_staff
  WHERE master_staff_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to cascade delete on master_staff deletion
DROP TRIGGER IF EXISTS trigger_cascade_delete_journey_staff ON master_staff;
CREATE TRIGGER trigger_cascade_delete_journey_staff
  BEFORE DELETE ON master_staff
  FOR EACH ROW
  EXECUTE FUNCTION cascade_delete_journey_staff();

-- Function to cascade delete day assignments when journey_staff is deleted
CREATE OR REPLACE FUNCTION cascade_delete_day_assignments()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all day assignments for this journey_staff
  DELETE FROM journey_staff_day_assignments
  WHERE journey_staff_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to cascade delete on journey_staff deletion
DROP TRIGGER IF EXISTS trigger_cascade_delete_day_assignments ON journey_staff;
CREATE TRIGGER trigger_cascade_delete_day_assignments
  BEFORE DELETE ON journey_staff
  FOR EACH ROW
  EXECUTE FUNCTION cascade_delete_day_assignments();

-- Add helpful comment
COMMENT ON FUNCTION sync_master_staff_to_journey_staff() IS 'Automatically syncs master_staff changes to all related journey_staff entries';
COMMENT ON FUNCTION cascade_delete_journey_staff() IS 'Cascades deletion from master_staff to journey_staff';
COMMENT ON FUNCTION cascade_delete_day_assignments() IS 'Cascades deletion from journey_staff to journey_staff_day_assignments';
