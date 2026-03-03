/*
  # Comprehensive Trip to Journey Rename

  1. Changes
    - Rename all functions with "trip" in the name to use "journey"
    - Rename all triggers with "trip" in the name to use "journey"
    - Rename all constraints with "trip" in the name to use "journey"
    - Rename all columns with "trip" in the name to use "journey"
    
  2. Scope
    - Functions: log_trip_updates, has_trip_access, update_trip_documents_updated_at, update_trip_gear_updated_at
    - Triggers: trip_updates_trigger, update_trips_updated_at, trip_documents_updated_at, trip_gear_updated_at, update_trip_templates_updated_at
    - Columns: trip_id → journey_id, trip_share_id → journey_share_id
    - All constraints with "trip" in their names
    
  3. Notes
    - This is a comprehensive cleanup to ensure naming consistency
    - All foreign key constraints will be properly updated
*/

-- ============================================================================
-- STEP 1: Rename Functions
-- ============================================================================

-- Rename log_trip_updates to log_journey_updates
ALTER FUNCTION log_trip_updates() RENAME TO log_journey_updates;

-- Rename has_trip_access to has_journey_access (with all 3 parameters)
ALTER FUNCTION has_trip_access(UUID, UUID, TEXT) RENAME TO has_journey_access;

-- Rename update_trip_documents_updated_at to update_journey_documents_updated_at
ALTER FUNCTION update_trip_documents_updated_at() RENAME TO update_journey_documents_updated_at;

-- Rename update_trip_gear_updated_at to update_journey_gear_updated_at
ALTER FUNCTION update_trip_gear_updated_at() RENAME TO update_journey_gear_updated_at;

-- ============================================================================
-- STEP 2: Rename Triggers
-- ============================================================================

-- Rename triggers on journeys table
ALTER TRIGGER trip_updates_trigger ON journeys RENAME TO journey_updates_trigger;
ALTER TRIGGER update_trips_updated_at ON journeys RENAME TO update_journeys_updated_at;

-- Rename triggers on journey_documents table
ALTER TRIGGER trip_documents_updated_at ON journey_documents RENAME TO journey_documents_updated_at;

-- Rename triggers on journey_gear table
ALTER TRIGGER trip_gear_updated_at ON journey_gear RENAME TO journey_gear_updated_at;

-- Rename triggers on journey_templates table
ALTER TRIGGER update_trip_templates_updated_at ON journey_templates RENAME TO update_journey_templates_updated_at;

-- ============================================================================
-- STEP 3: Rename Columns
-- ============================================================================

-- Rename columns (constraint names will be auto-updated by PostgreSQL)
ALTER TABLE extracted_itinerary_data RENAME COLUMN trip_id TO journey_id;
ALTER TABLE journey_share_days RENAME COLUMN trip_share_id TO journey_share_id;
ALTER TABLE ocr_itinerary_items RENAME COLUMN trip_id TO journey_id;
ALTER TABLE properties RENAME COLUMN trip_id TO journey_id;
ALTER TABLE shared_links RENAME COLUMN trip_id TO journey_id;
ALTER TABLE uploaded_files RENAME COLUMN trip_id TO journey_id;

-- ============================================================================
-- STEP 4: Rename Constraints
-- ============================================================================

-- Journey assignments
ALTER TABLE journey_assignments RENAME CONSTRAINT trip_assignments_pkey TO journey_assignments_pkey;
ALTER TABLE journey_assignments RENAME CONSTRAINT trip_assignments_trip_id_fkey TO journey_assignments_journey_id_fkey;
ALTER TABLE journey_assignments RENAME CONSTRAINT trip_assignments_trip_id_user_id_key TO journey_assignments_journey_id_user_id_key;
ALTER TABLE journey_assignments RENAME CONSTRAINT trip_assignments_user_id_fkey TO journey_assignments_user_id_fkey;

-- Journey document activities
ALTER TABLE journey_document_activities RENAME CONSTRAINT trip_document_activities_action_type_check TO journey_document_activities_action_type_check;
ALTER TABLE journey_document_activities RENAME CONSTRAINT trip_document_activities_pkey TO journey_document_activities_pkey;
ALTER TABLE journey_document_activities RENAME CONSTRAINT trip_document_activities_trip_id_fkey TO journey_document_activities_journey_id_fkey;
ALTER TABLE journey_document_activities RENAME CONSTRAINT trip_document_activities_user_id_fkey TO journey_document_activities_user_id_fkey;

-- Journey document views
ALTER TABLE journey_document_views RENAME CONSTRAINT trip_document_views_document_id_fkey TO journey_document_views_document_id_fkey;
ALTER TABLE journey_document_views RENAME CONSTRAINT trip_document_views_document_id_user_id_key TO journey_document_views_document_id_user_id_key;
ALTER TABLE journey_document_views RENAME CONSTRAINT trip_document_views_pkey TO journey_document_views_pkey;
ALTER TABLE journey_document_views RENAME CONSTRAINT trip_document_views_user_id_fkey TO journey_document_views_user_id_fkey;

-- Journey documents
ALTER TABLE journey_documents RENAME CONSTRAINT trip_documents_document_category_check TO journey_documents_document_category_check;
ALTER TABLE journey_documents RENAME CONSTRAINT trip_documents_pkey TO journey_documents_pkey;
ALTER TABLE journey_documents RENAME CONSTRAINT trip_documents_trip_id_fkey TO journey_documents_journey_id_fkey;
ALTER TABLE journey_documents RENAME CONSTRAINT trip_documents_upload_direction_check TO journey_documents_upload_direction_check;
ALTER TABLE journey_documents RENAME CONSTRAINT trip_documents_uploaded_by_fkey TO journey_documents_uploaded_by_fkey;

-- Journey gear
ALTER TABLE journey_gear RENAME CONSTRAINT trip_gear_pkey TO journey_gear_pkey;
ALTER TABLE journey_gear RENAME CONSTRAINT trip_gear_trip_id_fkey TO journey_gear_journey_id_fkey;

-- Journey notifications
ALTER TABLE journey_notifications RENAME CONSTRAINT trip_notifications_notification_type_check TO journey_notifications_notification_type_check;
ALTER TABLE journey_notifications RENAME CONSTRAINT trip_notifications_pkey TO journey_notifications_pkey;
ALTER TABLE journey_notifications RENAME CONSTRAINT trip_notifications_related_document_id_fkey TO journey_notifications_related_document_id_fkey;
ALTER TABLE journey_notifications RENAME CONSTRAINT trip_notifications_trip_id_fkey TO journey_notifications_journey_id_fkey;
ALTER TABLE journey_notifications RENAME CONSTRAINT trip_notifications_user_id_fkey TO journey_notifications_user_id_fkey;

-- Journey share days
ALTER TABLE journey_share_days RENAME CONSTRAINT trip_share_days_day_id_fkey TO journey_share_days_day_id_fkey;
ALTER TABLE journey_share_days RENAME CONSTRAINT trip_share_days_pkey TO journey_share_days_pkey;
ALTER TABLE journey_share_days RENAME CONSTRAINT trip_share_days_trip_share_id_day_id_key TO journey_share_days_journey_share_id_day_id_key;
ALTER TABLE journey_share_days RENAME CONSTRAINT trip_share_days_trip_share_id_fkey TO journey_share_days_journey_share_id_fkey;

-- Journey share links
ALTER TABLE journey_share_links RENAME CONSTRAINT trip_share_links_created_by_fkey TO journey_share_links_created_by_fkey;
ALTER TABLE journey_share_links RENAME CONSTRAINT trip_share_links_permission_level_check TO journey_share_links_permission_level_check;
ALTER TABLE journey_share_links RENAME CONSTRAINT trip_share_links_pkey TO journey_share_links_pkey;
ALTER TABLE journey_share_links RENAME CONSTRAINT trip_share_links_share_token_key TO journey_share_links_share_token_key;
ALTER TABLE journey_share_links RENAME CONSTRAINT trip_share_links_trip_id_fkey TO journey_share_links_journey_id_fkey;

-- Journey shares
ALTER TABLE journey_shares RENAME CONSTRAINT trip_shares_permission_level_check TO journey_shares_permission_level_check;
ALTER TABLE journey_shares RENAME CONSTRAINT trip_shares_pkey TO journey_shares_pkey;
ALTER TABLE journey_shares RENAME CONSTRAINT trip_shares_trip_id_shared_with_key TO journey_shares_journey_id_shared_with_key;

-- Journey staff
ALTER TABLE journey_staff RENAME CONSTRAINT trip_staff_master_staff_id_fkey TO journey_staff_master_staff_id_fkey;
ALTER TABLE journey_staff RENAME CONSTRAINT trip_staff_pkey TO journey_staff_pkey;
ALTER TABLE journey_staff RENAME CONSTRAINT trip_staff_trip_id_fkey TO journey_staff_journey_id_fkey;

-- Journey staff activity assignments
ALTER TABLE journey_staff_activity_assignments RENAME CONSTRAINT trip_staff_activity_assignments_activity_id_fkey TO journey_staff_activity_assignments_activity_id_fkey;
ALTER TABLE journey_staff_activity_assignments RENAME CONSTRAINT trip_staff_activity_assignments_pkey TO journey_staff_activity_assignments_pkey;
ALTER TABLE journey_staff_activity_assignments RENAME CONSTRAINT trip_staff_activity_assignments_staff_id_activity_id_key TO journey_staff_activity_assignments_staff_id_activity_id_key;
ALTER TABLE journey_staff_activity_assignments RENAME CONSTRAINT trip_staff_activity_assignments_staff_id_fkey TO journey_staff_activity_assignments_staff_id_fkey;

-- Journey staff day assignments
ALTER TABLE journey_staff_day_assignments RENAME CONSTRAINT trip_staff_day_assignments_day_id_fkey TO journey_staff_day_assignments_day_id_fkey;
ALTER TABLE journey_staff_day_assignments RENAME CONSTRAINT trip_staff_day_assignments_pkey TO journey_staff_day_assignments_pkey;
ALTER TABLE journey_staff_day_assignments RENAME CONSTRAINT trip_staff_day_assignments_staff_id_day_id_key TO journey_staff_day_assignments_staff_id_day_id_key;
ALTER TABLE journey_staff_day_assignments RENAME CONSTRAINT trip_staff_day_assignments_staff_id_fkey TO journey_staff_day_assignments_staff_id_fkey;

-- Journey templates
ALTER TABLE journey_templates RENAME CONSTRAINT trip_templates_created_by_fkey TO journey_templates_created_by_fkey;
ALTER TABLE journey_templates RENAME CONSTRAINT trip_templates_pkey TO journey_templates_pkey;

-- Journey transportation providers
ALTER TABLE journey_transportation_providers RENAME CONSTRAINT trip_transportation_providers_pkey TO journey_transportation_providers_pkey;
ALTER TABLE journey_transportation_providers RENAME CONSTRAINT trip_transportation_providers_trip_id_fkey TO journey_transportation_providers_journey_id_fkey;

-- Journey vehicle activity assignments
ALTER TABLE journey_vehicle_activity_assignments RENAME CONSTRAINT trip_vehicle_activity_assignments_activity_id_fkey TO journey_vehicle_activity_assignments_activity_id_fkey;
ALTER TABLE journey_vehicle_activity_assignments RENAME CONSTRAINT trip_vehicle_activity_assignments_pkey TO journey_vehicle_activity_assignments_pkey;
ALTER TABLE journey_vehicle_activity_assignments RENAME CONSTRAINT trip_vehicle_activity_assignments_vehicle_id_activity_id_key TO journey_vehicle_activity_assignments_vehicle_id_activity_id_key;
ALTER TABLE journey_vehicle_activity_assignments RENAME CONSTRAINT trip_vehicle_activity_assignments_vehicle_id_fkey TO journey_vehicle_activity_assignments_vehicle_id_fkey;

-- Journey vehicle day assignments
ALTER TABLE journey_vehicle_day_assignments RENAME CONSTRAINT trip_vehicle_day_assignments_day_id_fkey TO journey_vehicle_day_assignments_day_id_fkey;
ALTER TABLE journey_vehicle_day_assignments RENAME CONSTRAINT trip_vehicle_day_assignments_pkey TO journey_vehicle_day_assignments_pkey;
ALTER TABLE journey_vehicle_day_assignments RENAME CONSTRAINT trip_vehicle_day_assignments_vehicle_id_day_id_key TO journey_vehicle_day_assignments_vehicle_id_day_id_key;
ALTER TABLE journey_vehicle_day_assignments RENAME CONSTRAINT trip_vehicle_day_assignments_vehicle_id_fkey TO journey_vehicle_day_assignments_vehicle_id_fkey;

-- Journey vehicles
ALTER TABLE journey_vehicles RENAME CONSTRAINT trip_vehicles_driver_id_fkey TO journey_vehicles_driver_id_fkey;
ALTER TABLE journey_vehicles RENAME CONSTRAINT trip_vehicles_pkey TO journey_vehicles_pkey;
ALTER TABLE journey_vehicles RENAME CONSTRAINT trip_vehicles_provider_id_fkey TO journey_vehicles_provider_id_fkey;
ALTER TABLE journey_vehicles RENAME CONSTRAINT trip_vehicles_trip_id_fkey TO journey_vehicles_journey_id_fkey;

-- Journeys table
ALTER TABLE journeys RENAME CONSTRAINT trips_created_by_fkey TO journeys_created_by_fkey;
ALTER TABLE journeys RENAME CONSTRAINT trips_customer_id_fkey TO journeys_customer_id_fkey;
ALTER TABLE journeys RENAME CONSTRAINT trips_original_trip_id_fkey TO journeys_original_journey_id_fkey;
ALTER TABLE journeys RENAME CONSTRAINT trips_pkey TO journeys_pkey;
ALTER TABLE journeys RENAME CONSTRAINT trips_status_check TO journeys_status_check;

-- Itinerary constraints that reference trips
ALTER TABLE itinerary_days RENAME CONSTRAINT itinerary_days_trip_id_fkey TO itinerary_days_journey_id_fkey;
ALTER TABLE itinerary_entries RENAME CONSTRAINT itinerary_entries_trip_id_fkey TO itinerary_entries_journey_id_fkey;

-- Other tables with trip_id columns (already renamed above)
ALTER TABLE extracted_itinerary_data RENAME CONSTRAINT extracted_itinerary_data_trip_id_fkey TO extracted_itinerary_data_journey_id_fkey;
ALTER TABLE ocr_itinerary_items RENAME CONSTRAINT ocr_itinerary_items_trip_id_fkey TO ocr_itinerary_items_journey_id_fkey;
ALTER TABLE properties RENAME CONSTRAINT properties_trip_id_fkey TO properties_journey_id_fkey;
ALTER TABLE shared_links RENAME CONSTRAINT shared_links_trip_id_fkey TO shared_links_journey_id_fkey;
ALTER TABLE uploaded_documents RENAME CONSTRAINT uploaded_documents_trip_id_fkey TO uploaded_documents_journey_id_fkey;
ALTER TABLE uploaded_files RENAME CONSTRAINT uploaded_files_trip_id_fkey TO uploaded_files_journey_id_fkey;
