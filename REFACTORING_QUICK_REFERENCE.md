# SELECT * Refactoring Quick Reference Guide

## Quick Links to Most Important Items

### CRITICAL - Security Issues (Do First!)
1. **UserManagement.tsx:67** - `users` table
   ```typescript
   // BEFORE
   .from('users').select('*')
   
   // AFTER
   .from('users').select('id, email, full_name, role, status, created_at, updated_at')
   ```

2. **ClientView.tsx:51, TripEditor.tsx:51** - `customers` table (PII)
   ```typescript
   // BEFORE
   .from('customers').select('*')
   
   // AFTER
   .from('customers').select('id, name, contact_number, email, notes')
   ```

3. **StaffTab.tsx:112** - `journey_staff` table
   ```typescript
   // BEFORE
   .from('journey_staff').select('*')
   
   // AFTER
   .from('journey_staff').select('id, journey_id, master_staff_id, name, role, role_custom, staff_type, email, phone, emergency_contact, status, availability, payment_status, created_at, updated_at')
   ```

### CRITICAL - Financial Data
1. **ActivityModal.tsx:176, AllTripsFeesManager.tsx:171, ItineraryEntryFeeEditor.tsx:45** - `activity_booking_fees`
   ```typescript
   // AFTER
   .from('activity_booking_fees').select('id, activity_id, booking_type, amount, currency, payment_status, created_at, updated_at')
   ```

### CRITICAL - Edge Functions
1. **supabase/functions/process-ocr-document/index.ts:51**
   ```typescript
   // AFTER
   .from('uploaded_documents').select('id, trip_id, file_name, storage_path, file_type, file_size, ocr_status, created_at, updated_at')
   ```

2. **supabase/functions/process-uploaded-file/index.ts:59**
   ```typescript
   // AFTER
   .from('uploaded_files').select('id, trip_id, file_name, storage_path, file_type, file_size, processing_status, created_at, updated_at')
   ```

## Common Column Sets (Copy & Paste)

### Core Itinerary Tables
```typescript
// Journeys
.select('id, journey_name, start_date, end_date, duration_days, status, customer_id, created_at, updated_at')

// Itinerary Days
.select('id, journey_id, day_number, date, city_destination, early_morning_section_enabled, breakfast_section_enabled, lunch_section_enabled, dinner_section_enabled, night_section_enabled')

// Accommodations
.select('id, day_id, hotel_name, location_address, check_in_time, check_out_time, booking_status, payment_status, confirmation_number, guide_notes, created_at, updated_at')

// Activities
.select('id, day_id, activity_name, activity_time, location, display_order, description, booking_status, created_at, updated_at')

// Dining
.select('id, day_id, restaurant_name, reservation_time, party_size, display_order, booking_status, created_at, updated_at')

// Transportation
.select('id, day_id, provider, vehicle_type, departure_time, arrival_time, booking_status, payment_status, confirmation_number, created_at, updated_at')
```

### Master Data Tables
```typescript
// Templates
.select('id, name, description, total_days, is_active, created_at, updated_at')

// Template Days
.select('id, template_id, day_number, city_destination, order_index')

// Journey Gear
.select('id, journey_id, item_name, item_type, quantity, created_at, updated_at')

// Journey Vehicles
.select('id, journey_id, vehicle_type, registration_number, capacity, driver_id, created_at, updated_at')

// Master Staff
.select('id, name, email, phone, role, staff_type, created_at, updated_at')
```

## Files with Multiple Instances to Prioritize

| File | Instances | Priority | Phase |
|------|-----------|----------|-------|
| TripManager.tsx | 10 | High | 2 |
| GuideView.tsx | 10 | High | 2 |
| DuplicateTripModal.tsx | 5 | High | 2 |
| AdminDashboard.tsx | 6 | High | 2 |
| DayEditor.tsx | 4 | Medium | 2 |
| ClientView.tsx | 6 | Medium | 2 |
| DatabaseManagement.tsx | 8 | REVIEW | 1 |

## Testing Checklist

After refactoring each file:
- [ ] Component renders without console errors
- [ ] All displayed data appears correctly
- [ ] No "undefined" or missing values in UI
- [ ] Network tab shows fewer bytes transferred
- [ ] TypeScript types match selected columns
- [ ] Sort/filter operations still work
- [ ] Search functionality still works
- [ ] Export functionality still works

## Performance Verification

Run these before/after:
```bash
# Check network tab (DevTools)
# Look for query execution times in Network tab
# Monitor console for any warnings/errors
# Test with large datasets if possible
```

## Rollback Plan

If something breaks:
1. Git checkout the original file
2. Check the column list in ANALYSIS.md
3. Verify the exact table being queried
4. Test with simpler column selection first
5. Gradually add back necessary columns

## Notes
- Always test after editing - components may depend on specific columns
- Some relations may need special handling (e.g., `activity_booking_fees(*)`)
- Keep related queries consistent across files
- Document any special cases in comments
