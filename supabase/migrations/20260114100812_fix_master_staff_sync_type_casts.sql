/*
  # Fix Master Staff Sync Type Casts
  
  1. Changes
    - Fix type casting in sync_master_staff_to_journey_staff function
    - Correct type names:
      - staff_role → staff_role_type
      - staff_status → staff_status_type
      - availability_status → staff_availability_type
  
  2. Notes
    - This fixes the "type staff_role does not exist" error when creating new staff
*/

-- Fix the sync function with correct type casts
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
    role = NEW.category::staff_role_type,
    role_custom = NEW.subcategory,
    staff_type = NEW.staff_type::staff_type,
    status = NEW.status::staff_status_type,
    availability = NEW.availability::staff_availability_type,
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
