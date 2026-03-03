/*
  # Comprehensive Rename: Trips to Journeys Throughout Platform

  1. Tables Renamed
    - `trips` → `journeys`
    - `trip_shares` → `journey_shares`
    - `trip_share_links` → `journey_share_links`
    - `trip_share_days` → `journey_share_days`
    - `trip_assignments` → `journey_assignments`
    - `trip_templates` → `journey_templates`
    - `trip_staff` → `journey_staff`
    - `trip_staff_day_assignments` → `journey_staff_day_assignments`
    - `trip_staff_activity_assignments` → `journey_staff_activity_assignments`
    - `trip_documents` → `journey_documents`
    - `trip_document_views` → `journey_document_views`
    - `trip_document_activities` → `journey_document_activities`
    - `trip_notifications` → `journey_notifications`
    - `trip_transportation_providers` → `journey_transportation_providers`
    - `trip_vehicles` → `journey_vehicles`
    - `trip_vehicle_day_assignments` → `journey_vehicle_day_assignments`
    - `trip_vehicle_activity_assignments` → `journey_vehicle_activity_assignments`
    - `trip_gear` → `journey_gear`

  2. Columns Renamed
    - All `trip_id` → `journey_id`
    - `trip_name` → `journey_name`
    - `original_trip_id` → `original_journey_id`
    - `is_trip_template` → `is_journey_template`
    - `template_trip_id` → `template_journey_id`

  3. Functions Updated
    - `has_edit_permission(trip_id, user_id)` → `has_edit_permission(journey_id, user_id)`

  4. Security
    - All RLS policies maintained with updated table/column names
    - All constraints and foreign keys preserved
    - All indexes preserved

  Important Notes:
    - This migration preserves ALL existing data
    - All relationships are maintained
    - No data loss occurs during this rename operation
*/

-- Step 1: Rename all tables
DO $$
BEGIN
  -- Rename trips to journeys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips') THEN
    ALTER TABLE trips RENAME TO journeys;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_shares') THEN
    ALTER TABLE trip_shares RENAME TO journey_shares;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_share_links') THEN
    ALTER TABLE trip_share_links RENAME TO journey_share_links;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_share_days') THEN
    ALTER TABLE trip_share_days RENAME TO journey_share_days;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_assignments') THEN
    ALTER TABLE trip_assignments RENAME TO journey_assignments;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_templates') THEN
    ALTER TABLE trip_templates RENAME TO journey_templates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_staff') THEN
    ALTER TABLE trip_staff RENAME TO journey_staff;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_staff_day_assignments') THEN
    ALTER TABLE trip_staff_day_assignments RENAME TO journey_staff_day_assignments;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_staff_activity_assignments') THEN
    ALTER TABLE trip_staff_activity_assignments RENAME TO journey_staff_activity_assignments;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_documents') THEN
    ALTER TABLE trip_documents RENAME TO journey_documents;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_document_views') THEN
    ALTER TABLE trip_document_views RENAME TO journey_document_views;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_document_activities') THEN
    ALTER TABLE trip_document_activities RENAME TO journey_document_activities;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_notifications') THEN
    ALTER TABLE trip_notifications RENAME TO journey_notifications;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_transportation_providers') THEN
    ALTER TABLE trip_transportation_providers RENAME TO journey_transportation_providers;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_vehicles') THEN
    ALTER TABLE trip_vehicles RENAME TO journey_vehicles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_vehicle_day_assignments') THEN
    ALTER TABLE trip_vehicle_day_assignments RENAME TO journey_vehicle_day_assignments;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_vehicle_activity_assignments') THEN
    ALTER TABLE trip_vehicle_activity_assignments RENAME TO journey_vehicle_activity_assignments;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_gear') THEN
    ALTER TABLE trip_gear RENAME TO journey_gear;
  END IF;
END $$;

-- Step 2: Rename columns in journeys table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journeys' AND column_name = 'trip_name') THEN
    ALTER TABLE journeys RENAME COLUMN trip_name TO journey_name;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journeys' AND column_name = 'original_trip_id') THEN
    ALTER TABLE journeys RENAME COLUMN original_trip_id TO original_journey_id;
  END IF;
END $$;

-- Step 3: Rename trip_id columns in all related tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itinerary_days' AND column_name = 'trip_id') THEN
    ALTER TABLE itinerary_days RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_shares' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_shares RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_share_links' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_share_links RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_share_days' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_share_days RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_assignments' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_assignments RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploaded_documents' AND column_name = 'trip_id') THEN
    ALTER TABLE uploaded_documents RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ocr_extractions' AND column_name = 'trip_id') THEN
    ALTER TABLE ocr_extractions RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itinerary_entries' AND column_name = 'trip_id') THEN
    ALTER TABLE itinerary_entries RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_log' AND column_name = 'trip_id') THEN
    ALTER TABLE activity_log RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_staff' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_staff RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_staff_day_assignments' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_staff_day_assignments RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_staff_activity_assignments' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_staff_activity_assignments RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_documents' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_documents RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_document_views' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_document_views RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_document_activities' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_document_activities RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_notifications' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_notifications RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_transportation_providers' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_transportation_providers RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_vehicles' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_vehicles RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_vehicle_day_assignments' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_vehicle_day_assignments RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_vehicle_activity_assignments' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_vehicle_activity_assignments RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_gear' AND column_name = 'trip_id') THEN
    ALTER TABLE journey_gear RENAME COLUMN trip_id TO journey_id;
  END IF;
  
  -- Master templates columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_templates' AND column_name = 'is_trip_template') THEN
    ALTER TABLE master_templates RENAME COLUMN is_trip_template TO is_journey_template;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'master_templates' AND column_name = 'template_trip_id') THEN
    ALTER TABLE master_templates RENAME COLUMN template_trip_id TO template_journey_id;
  END IF;
END $$;

-- Step 4: Update has_edit_permission function
DROP FUNCTION IF EXISTS has_edit_permission(uuid, uuid);

CREATE OR REPLACE FUNCTION has_edit_permission(journey_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    -- User is admin
    EXISTS (
      SELECT 1 FROM users WHERE id = user_id AND role = 'admin'
    )
    OR
    -- User is owner
    EXISTS (
      SELECT 1 FROM journeys WHERE id = journey_id AND created_by = user_id
    )
    OR
    -- User has edit permission through share
    EXISTS (
      SELECT 1 FROM journey_shares 
      WHERE journey_shares.journey_id = has_edit_permission.journey_id 
      AND journey_shares.user_id = has_edit_permission.user_id 
      AND journey_shares.permission IN ('edit', 'admin')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
