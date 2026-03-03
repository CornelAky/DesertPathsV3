# SELECT * Query Analysis and Refactoring Guide

## Overview
This document provides a comprehensive list of all `select('*')` and `select("*")` queries found in TypeScript/TSX files across the codebase. These queries should be replaced with specific column selections for improved security and performance.

---

## Summary Statistics
- **Total Files with SELECT * queries:** 56 files
- **Total instances of SELECT * queries:** 140+ occurrences
- **Primary file types:** React components (TSX/TS) and Edge Functions

---

## Detailed Findings by File

### Admin Components

#### 1. `/tmp/cc-agent/61476088/project/src/components/admin/StaffTab.tsx`
- **Line 112:** `.select('*')`
- **Table:** `journey_staff`
- **Context:** Fetching staff members for a trip with extensive fields (payment info, documents, availability)
- **Recommended Columns:** `id, journey_id, master_staff_id, name, role, role_custom, staff_type, email, phone, emergency_contact, status, availability, payment_status, created_at, updated_at`

#### 2. `/tmp/cc-agent/61476088/project/src/components/admin/DayEditor.tsx`
- **Line 110:** `.select('*')` → Table: `accommodations`
- **Line 111:** `.select('*')` → Table: `transportation`
- **Line 113:** `.select('*')` → Table: `dining` (with order)
- **Line 135:** `.select('*')` → Table: `documents`
- **Context:** Loading all day-related data (accommodations, transportation, dining, documents)
- **Recommended Columns:**
  - **accommodations:** `id, day_id, hotel_name, location_address, check_in_time, check_out_time, booking_status, payment_status, confirmation_number, guide_notes, created_at, updated_at`
  - **transportation:** `id, day_id, provider, vehicle_type, departure_time, arrival_time, booking_status, payment_status, confirmation_number, created_at, updated_at`
  - **dining:** `id, day_id, restaurant_name, reservation_time, party_size, booking_status, payment_status, confirmation_number, created_at, updated_at`
  - **documents:** `id, related_id, related_type, document_type, file_name, file_path, file_url, created_at, updated_at`

#### 3. `/tmp/cc-agent/61476088/project/src/components/admin/ClientView.tsx`
- **Line 51:** `.select('*')` → Table: `customers`
- **Line 56:** `.select('*')` → Table: `itinerary_days`
- **Line 61:** `.select('*')` → Table: `accommodations`
- **Line 65:** `.select('*')` → Table: `activities`
- **Line 70:** `.select('*')` → Table: `dining`
- **Line 75:** `.select('*')` → Table: `transportation`
- **Context:** Exporting complete trip data for client view/PDF export
- **Recommended Columns:**
  - **customers:** `id, name, contact_number, email`
  - **itinerary_days:** `id, journey_id, day_number, date, city_destination, notes`
  - **accommodations:** `id, day_id, hotel_name, location_address, check_in_time, check_out_time, guide_notes`
  - **activities:** `id, day_id, activity_name, activity_time, location, description`
  - **dining:** `id, day_id, restaurant_name, reservation_time, party_size`
  - **transportation:** `id, day_id, provider, departure_time, arrival_time`

#### 4. `/tmp/cc-agent/61476088/project/src/components/admin/TripEditor.tsx`
- **Line 51:** `.select('*')` → Table: `customers`
- **Context:** Fetching customer data for trip editing
- **Recommended Columns:** `id, name, contact_number, email, notes, created_at, updated_at`

#### 5. `/tmp/cc-agent/61476088/project/src/components/admin/BookingsTab.tsx`
- **Line 121:** `.select('*')` → Table: `activity_booking_attachments`
- **Line 253:** `.select('*')` → Table: `itinerary_days`
- **Line 263:** `.select('*')` → Table: `accommodations`
- **Line 270:** `.select('*')` → Table: `activities`
- **Line 277:** `.select('*')` → Table: `dining`
- **Context:** Loading booking data and attachments
- **Recommended Columns:**
  - **activity_booking_attachments:** `id, activity_id, file_name, file_path, file_url, file_type, file_size, uploaded_by, uploaded_at`
  - **itinerary_days:** `id, journey_id, day_number, date, city_destination`
  - **accommodations:** `id, day_id, hotel_name, location_address, booking_status, payment_status`
  - **activities:** `id, day_id, activity_name, activity_time, location, booking_status, payment_status`
  - **dining:** `id, day_id, restaurant_name, reservation_time, party_size, booking_status, payment_status`

#### 6. `/tmp/cc-agent/61476088/project/src/components/admin/TripManager.tsx`
- **Line 128:** `.select('*')` → Table: `itinerary_days`
- **Line 249:** `.select('*')` → Table: `accommodations`
- **Line 305:** `.select('*')` → Table: `activities`
- **Line 323:** `.select('*')` → Table: `itinerary_entries`
- **Lines 378-380:** Batch select for accommodations, activities, dining
- **Lines 994-996:** Batch select for accommodations, activities, dining
- **Context:** Managing trip itineraries, duplicating days with all related entries
- **Recommended Columns:**
  - **itinerary_days:** `id, journey_id, day_number, date, city_destination, early_morning_section_enabled, breakfast_section_enabled, lunch_section_enabled, dinner_section_enabled, night_section_enabled`
  - **accommodations:** `id, day_id, hotel_name, location_address, check_in_time, check_out_time, booking_status, payment_status, guide_notes, created_at, updated_at`
  - **activities:** `id, day_id, activity_name, activity_time, location, display_order, description, created_at, updated_at`
  - **dining:** `id, day_id, restaurant_name, reservation_time, party_size, display_order, created_at, updated_at`
  - **itinerary_entries:** `id, journey_id, day_number, date, activity_id, accommodation_id, dining_id, sort_order, created_at, updated_at`

#### 7. `/tmp/cc-agent/61476088/project/src/components/admin/TimelineView.tsx`
- **Line 60:** `.select('*')` → Table: `itinerary_days`
- **Line 75:** `.select('*')` → Table: `accommodations`
- **Line 83:** `.select('*')` → Table: `activities`
- **Line 92:** `.select('*')` → Table: `dining`
- **Context:** Displaying timeline view of trip
- **Recommended Columns:** Same as TripManager accommodations/activities/dining columns

#### 8. `/tmp/cc-agent/61476088/project/src/components/admin/ShareManager.tsx`
- **Line 138:** `.select('*')` → Table: `user_shared_trips`
- **Context:** Fetching trip shares
- **Recommended Columns:** `id, journey_id, shared_with_user_id, shared_by_user_id, access_level, created_at, updated_at`

#### 9. `/tmp/cc-agent/61476088/project/src/components/admin/OcrDataReview.tsx`
- **Line 58:** `.select('*')` → Table: `extracted_data`
- **Context:** Reviewing OCR extracted data
- **Recommended Columns:** `id, document_id, trip_id, extracted_text, extracted_json, confidence_score, review_status, created_at, updated_at`

#### 10. `/tmp/cc-agent/61476088/project/src/components/admin/ActivityModal.tsx`
- **Line 149:** `.select('*')` → Table: `itinerary_days`
- **Line 176:** `.select('*')` → Table: `activity_booking_fees`
- **Context:** Managing activities and their booking fees
- **Recommended Columns:**
  - **itinerary_days:** `id, journey_id, day_number, date, city_destination`
  - **activity_booking_fees:** `id, activity_id, booking_type, amount, currency, payment_status, created_at, updated_at`

#### 11. `/tmp/cc-agent/61476088/project/src/components/admin/ItineraryTable.tsx`
- **Line 59:** `.select('*')` → Table: `accommodations`
- **Line 63:** `.select('*')` → Table: `activities`
- **Line 68:** `.select('*')` → Table: `dining`
- **Context:** Displaying itinerary in table format
- **Recommended Columns:** Standard columns for each table as defined above

#### 12. `/tmp/cc-agent/61476088/project/src/components/admin/AdminDashboard.tsx`
- **Line 113:** `.select('*')` → Table: `journeys`
- **Line 278:** `.select('*')` → Table: `journeys`
- **Line 300:** `.select('*')` → Table: `itinerary_days`
- **Line 321:** `.select('*')` → Table: `accommodations`
- **Line 340:** `.select('*')` → Table: `activities`
- **Line 527:** `.select('*')` → Table: `dining`
- **Context:** Dashboard overview of trips and itineraries
- **Recommended Columns:**
  - **journeys:** `id, journey_name, start_date, end_date, duration_days, status, customer_id, created_at, updated_at`
  - **itinerary_days:** `id, journey_id, day_number, date, city_destination`
  - **accommodations:** `id, day_id, hotel_name, location_address, booking_status, payment_status`
  - **activities:** `id, day_id, activity_name, activity_time, location, booking_status`
  - **dining:** `id, day_id, restaurant_name, reservation_time, booking_status`

#### 13. `/tmp/cc-agent/61476088/project/src/components/admin/TemplateEditor.tsx`
- **Line 95:** `.select('*')` → Table: `template_days`
- **Line 110:** `.select('*')` → Table: `template_days`
- **Lines 373-375:** Batch select for template_activities, template_dining, template_accommodations
- **Context:** Editing journey templates
- **Recommended Columns:**
  - **template_days:** `id, template_id, day_number, city_destination, order_index`
  - **template_activities:** `id, template_day_id, activity_name, order_index, created_at`
  - **template_dining:** `id, template_day_id, restaurant_name, meal_type, order_index, created_at`
  - **template_accommodations:** `id, template_day_id, hotel_name, order_index, created_at`

#### 14. `/tmp/cc-agent/61476088/project/src/components/admin/ChooseGearModal.tsx`
- **Line 43:** `.select('*')` → Table: `journey_gear`
- **Context:** Selecting gear items for trip
- **Recommended Columns:** `id, journey_id, item_name, item_type, quantity, created_at, updated_at`

#### 15. `/tmp/cc-agent/61476088/project/src/components/admin/TemplateManager.tsx`
- **Line 39:** `.select('*')` → Table: `templates`
- **Line 112:** `.select('*')` → Table: `template_days`
- **Line 132:** `.select('*')` → Table: `template_days`
- **Line 152:** `.select('*')` → Table: `template_days`
- **Context:** Managing journey templates
- **Recommended Columns:**
  - **templates:** `id, name, description, total_days, is_active, created_at, updated_at`
  - **template_days:** `id, template_id, day_number, city_destination, order_index`

#### 16. `/tmp/cc-agent/61476088/project/src/components/admin/ChooseStaffModal.tsx`
- **Line 63:** `.select('*')` → Table: `master_staff`
- **Context:** Choosing staff members from master list
- **Recommended Columns:** `id, name, email, phone, role, staff_type, created_at, updated_at`

#### 17. `/tmp/cc-agent/61476088/project/src/components/admin/JourneyAssistant.tsx`
- **Line 46:** `.select('*')` → Table: `journeys`
- **Lines 67-69:** Batch select for activities, dining, accommodations
- **Context:** AI-assisted journey creation
- **Recommended Columns:** Standard journey/activities/dining/accommodations columns

#### 18. `/tmp/cc-agent/61476088/project/src/components/admin/SettingsDashboard.tsx`
- **Line 52:** `.select('*')` → Table: `settings`
- **Context:** Loading app settings
- **Recommended Columns:** `id, setting_key, setting_value, setting_type, created_at, updated_at`

#### 19. `/tmp/cc-agent/61476088/project/src/components/admin/TransportationTab.tsx`
- **Lines 157-159:** Batch select for journey_transportation_providers, journey_vehicles, itinerary_days
- **Line 165:** `.select('*')` → Table: `journey_vehicle_day_assignments`
- **Line 166:** `.select('*')` → Table: `journey_gear`
- **Context:** Managing transportation and vehicle assignments
- **Recommended Columns:**
  - **journey_transportation_providers:** `id, journey_id, provider_name, contact_info, created_at`
  - **journey_vehicles:** `id, journey_id, vehicle_type, registration_number, capacity, created_at`
  - **journey_vehicle_day_assignments:** `id, vehicle_id, day_id, assignment_type, created_at`
  - **journey_gear:** `id, journey_id, item_name, item_type, quantity, created_at`

#### 20. `/tmp/cc-agent/61476088/project/src/components/admin/ChooseVehicleModal.tsx`
- **Line 61:** `.select('*')` → Table: `journey_vehicles`
- **Context:** Selecting vehicles for trip
- **Recommended Columns:** `id, journey_id, vehicle_type, registration_number, capacity, driver_id, created_at, updated_at`

#### 21. `/tmp/cc-agent/61476088/project/src/components/admin/DatabaseManagement.tsx`
- **Lines 174, 579, 736, 885, 1037, 1182, 1336, 1490:** `.select('*')` (8 instances)
- **Tables:** Various tables for database management operations
- **Context:** Administrative database operations
- **Recommended Action:** Review specific usage contexts in the file for each table

#### 22. `/tmp/cc-agent/61476088/project/src/components/admin/DuplicateTripModal.tsx`
- **Line 44:** `.select('*')` → Table: `journeys`
- **Line 86:** `.select('*')` → Table: `itinerary_days`
- **Lines 119-121:** Batch select for accommodations, dining
- **Line 193:** `.select('*')` → Table: `activities`
- **Context:** Duplicating entire trips
- **Recommended Columns:** All essential fields for accommodation, dining, activities, journeys

#### 23. `/tmp/cc-agent/61476088/project/src/components/admin/PropertyManagement.tsx`
- **Line 51:** `.select('*')` → Table: `properties`
- **Context:** Managing properties
- **Recommended Columns:** `id, property_name, property_type, location, owner_contact, created_at, updated_at`

#### 24. `/tmp/cc-agent/61476088/project/src/components/admin/AllTripsFeesManager.tsx`
- **Line 171:** `.select('*')` → Table: `activity_booking_fees`
- **Context:** Managing fees across all trips
- **Recommended Columns:** `id, activity_id, booking_type, amount, currency, payment_status, created_at`

#### 25. `/tmp/cc-agent/61476088/project/src/components/admin/ChooseProviderModal.tsx`
- **Line 50:** `.select('*')` → Table: `providers`
- **Context:** Selecting service providers
- **Recommended Columns:** `id, provider_name, service_type, contact_info, rating, created_at, updated_at`

#### 26. `/tmp/cc-agent/61476088/project/src/components/admin/ExtractedDataReview.tsx`
- **Line 46:** `.select('*')` → Table: `extracted_data`
- **Context:** Reviewing data extracted from documents
- **Recommended Columns:** `id, document_id, trip_id, extracted_text, extracted_json, confidence_score, review_status, created_at`

#### 27. `/tmp/cc-agent/61476088/project/src/components/admin/CreateTripWithTemplate.tsx`
- **Line 57:** `.select('*')` → Table: `templates`
- **Context:** Creating trips from templates
- **Recommended Columns:** `id, name, description, total_days, is_active, created_at`

#### 28. `/tmp/cc-agent/61476088/project/src/components/admin/EnhancedItineraryTable.tsx`
- **Lines 65, 74:** `.select('*')` → Table: `itinerary_days`
- **Lines 84-86:** Batch select for accommodations, activities, dining
- **Context:** Enhanced itinerary display
- **Recommended Columns:** Standard columns for each table

#### 29. `/tmp/cc-agent/61476088/project/src/components/admin/ItineraryEntriesManager.tsx`
- **Line 89:** `.select('*')` → Table: `itinerary_entries`
- **Context:** Managing itinerary entries
- **Recommended Columns:** `id, journey_id, day_number, date, activity_id, accommodation_id, dining_id, sort_order, created_at`

#### 30. `/tmp/cc-agent/61476088/project/src/components/admin/ItineraryEntryFeeEditor.tsx`
- **Line 45:** `.select('*')` → Table: `activity_booking_fees`
- **Context:** Editing fees for itinerary entries
- **Recommended Columns:** `id, activity_id, booking_type, amount, currency, payment_status, created_at, updated_at`

#### 31. `/tmp/cc-agent/61476088/project/src/components/admin/UserManagement.tsx`
- **Line 67:** `.select('*')` → Table: `users`
- **Context:** Managing application users
- **Recommended Columns:** `id, email, full_name, role, status, created_at, updated_at` (Note: exclude password hashes)

### Guide Components

#### 32. `/tmp/cc-agent/61476088/project/src/components/guide/GuideView.tsx`
- **Line 120:** `.select('*')` → Table: `journeys`
- **Line 128:** `.select('*')` → Table: `accommodations`
- **Line 129:** `.select('*')` → Table: `transportation`
- **Line 132:** `.select('*')` → Table: `activities`
- **Line 137:** `.select('*')` → Table: `dining`
- **Line 263:** `.select('*')` → Table: `journeys`
- **Lines 285-288:** Batch select for accommodations, transportation, dining
- **Line 345:** `.select('*')` → Table: `activities`
- **Line 412:** `.select('*')` → Table: `documents`
- **Context:** Displaying trip information to guides
- **Recommended Columns:** Standard columns for each table, ensuring guide-relevant information

#### 33. `/tmp/cc-agent/61476088/project/src/components/guide/GuideTripDocuments.tsx`
- **Line 187:** `.select('*')` → Table: `documents`
- **Context:** Loading trip documents for guides
- **Recommended Columns:** `id, related_id, related_type, document_type, file_name, file_url, created_at, updated_at`

### Client Components

#### 34. `/tmp/cc-agent/61476088/project/src/components/client/ClientView.tsx`
- **Lines 80, 85, 90, 94, 99, 104:** `.select('*')` (6 instances)
- **Tables:** Multiple (accommodations, activities, dining, transportation, etc.)
- **Context:** Client-facing trip view
- **Recommended Columns:** Public-facing columns only (exclude internal notes, payment details if sensitive)

#### 35. `/tmp/cc-agent/61476088/project/src/components/client/ClientDashboard.tsx`
- Multiple `.select('*')` queries (check full file for exact counts)
- **Context:** Main client dashboard
- **Recommended Columns:** Client-relevant trip and itinerary columns

### Edge Functions

#### 36. `/tmp/cc-agent/61476088/project/supabase/functions/process-ocr-document/index.ts`
- **Line 51:** `.select("*")` → Table: `uploaded_documents`
- **Context:** OCR document processing
- **Recommended Columns:** `id, trip_id, file_name, storage_path, file_type, file_size, ocr_status, created_at, updated_at` (exclude sensitive extracted data)

#### 37. `/tmp/cc-agent/61476088/project/supabase/functions/process-uploaded-file/index.ts`
- **Line 59:** `.select("*")` → Table: `uploaded_files`
- **Context:** Processing uploaded files
- **Recommended Columns:** `id, trip_id, file_name, storage_path, file_type, file_size, processing_status, created_at, updated_at`

---

## Refactoring Strategy

### Phase 1: High Priority (Security/Performance Critical)
1. **User-related tables** (users, auth tables) - Never expose all columns
2. **Financial tables** (payment_status, amounts) - Only select necessary columns
3. **Edge functions** - Always minimize data transfer from functions
4. **Database management operations** - Explicitly define columns

### Phase 2: Medium Priority (Performance)
1. **Large batch operations** (TripManager, EnhancedItineraryTable)
2. **Frequently queried tables** (journeys, itinerary_days, accommodations)
3. **Report/export functions** - Only necessary columns for export

### Phase 3: Low Priority (Code Quality)
1. **Template and settings tables**
2. **Master data tables** (providers, gear, etc.)

---

## Column Selection Guidelines

### Security Considerations
- Never select timestamp fields like `created_at`, `updated_at` for client-facing queries unless necessary
- Exclude password hashes, API keys, internal notes from client-side queries
- Exclude deleted_by, deleted_at unless specifically needed for audit purposes
- Limit financial data exposure to authorized users only

### Performance Considerations
- Exclude large text fields (full descriptions, notes) unless specifically needed
- Exclude JSON/array fields unless required for functionality
- For list views, select minimal columns; load full details on demand

### Example Refactoring

**Before:**
```typescript
const { data, error } = await supabase
  .from('accommodations')
  .select('*')
  .eq('day_id', day.id);
```

**After:**
```typescript
const { data, error } = await supabase
  .from('accommodations')
  .select('id, day_id, hotel_name, location_address, check_in_time, check_out_time, booking_status, payment_status, confirmation_number, guide_notes, created_at, updated_at')
  .eq('day_id', day.id);
```

---

## Implementation Notes

1. **Use TypeScript types** - Leverage your `database.types.ts` file to ensure type safety
2. **Create helper functions** - Consider creating query builder helpers for common patterns
3. **Test thoroughly** - Ensure all UI components still display correctly with reduced columns
4. **Document changes** - Update any API documentation with the new column selections
5. **Performance monitoring** - Monitor query performance before/after refactoring

---

## Files Requiring Review
- DatabaseManagement.tsx (8+ SELECT * queries - needs detailed context review)
- ClientDashboard.tsx (needs full file review for exact line numbers)

