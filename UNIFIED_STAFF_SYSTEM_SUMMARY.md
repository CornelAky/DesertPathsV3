# Unified User and Staff Management System - Implementation Summary

## What Has Been Completed

### 1. Database Schema ✅
- **master_staff table** enhanced with:
  - `category` and `subcategory` fields for staff categorization
  - `status` field ('active', 'inactive', 'on_leave', 'terminated')
  - `user_id` link to users table (with unique constraint)
  - Full profile and contact information
  - Vehicle information
  - Document and payment tracking

- **New Tables Created:**
  - `staff_documents` - Multiple documents per staff member
  - `staff_images` - Multiple images per staff member

- **users table** enhanced with:
  - `is_staff_member` boolean flag
  - Support for 'client' and 'manager' roles (in addition to 'admin' and 'guide')
  - Status field includes 'approved' state

- **journey_staff table** enhanced with:
  - `master_staff_id` reference (links journey staff to master_staff)
  - Maintains journey-specific data (payment, status, etc.)

### 2. Storage Buckets ✅
- `staff-documents` bucket created with RLS policies
- `staff-images` bucket created with RLS policies
- Policies allow:
  - All authenticated users to view
  - Admins and managers to manage all files
  - Staff members to manage their own files (via user_id link)

### 3. Sync Triggers ✅
- **Bidirectional sync** between users and master_staff:
  - When user is updated → syncs to master_staff (if `is_staff_member=true`)
  - When master_staff is updated → syncs to user (if `user_id` exists)
  - Synced fields: name, email, phone, profile photo, status

- **Auto-creation** trigger:
  - When user is created with `is_staff_member=true` → automatically creates master_staff record
  - No duplicate staff records possible (enforced by unique constraint on user_id)

### 4. TypeScript Types ✅
- Updated `database.types.ts` with:
  - Enhanced User type with `is_staff_member` field
  - Complete MasterStaff type with all new fields
  - StaffDocument type
  - StaffImage type
  - Updated JourneyStaff type with `master_staff_id`
  - Export types for all new tables

### 5. UI Components ✅
- **StaffDirectoryPage** component created:
  - Grid view of all staff members
  - Search by name, email, phone
  - Filter by category, status, and user link
  - Staff cards with profile photo, contact info, status badges
  - Document and image count display
  - Edit and delete actions
  - Visual indicator for user-linked staff

### 6. Database Cleanup ✅
- Migration created to remove all users except:
  - info@desertpaths.co (admin)
  - sales@desertpaths.co (admin)
  - gabriel@desertpaths.co (guide)
  - gabiromanian@yahoo.com (client)

## What Needs Manual Action

### 1. Password Reset (CRITICAL)
The passwords for the 4 remaining users need to be reset manually in Supabase Dashboard:

1. Go to Supabase Dashboard → Authentication → Users
2. For each of these users:
   - info@desertpaths.co
   - sales@desertpaths.co
   - gabriel@desertpaths.co
   - gabiromanian@yahoo.com
3. Click "..." menu → "Reset Password"
4. Set password to: `Tourblox2026`

### 2. Clean Up Auth Users
After the migration, you need to manually delete auth.users that don't match the 4 kept emails:
1. Go to Supabase Dashboard → Authentication → Users
2. Delete any users NOT in the list above

## What Still Needs to Be Built

### 1. Staff Add/Edit Modal (HIGH PRIORITY)
Create comprehensive modal for adding/editing staff with:
- All personal information fields
- Category and subcategory selection
- Multiple document upload with labels
- Multiple image upload with previews
- Link to existing user option
- Vehicle information
- Emergency contact
- Availability settings

### 2. User Creation Modal Enhancement (HIGH PRIORITY)
Update UserManagement.tsx to add:
- Checkbox: "Add to Staff Directory"
- When checked, show:
  - Staff category dropdown
  - Staff subcategory input
  - Document upload section
  - Image upload section
  - All staff-specific fields
- On save:
  - Set `is_staff_member=true`
  - Trigger will auto-create master_staff record
  - Upload files to storage buckets
  - Create staff_documents and staff_images records

### 3. Journey Staff Assignment Refactor (HIGH PRIORITY)
Update StaffTab.tsx to:
- Change "Add Staff" flow to use ChooseStaffModal (select from master_staff)
- Show master_staff information for each journey staff member
- Link to master_staff profile when clicking staff name
- Maintain journey-specific fields (payment, status) in journey_staff
- Remove duplicate fields, pull from master_staff instead

### 4. Master Staff Selection Modal (HIGH PRIORITY)
Create modal to select staff from master_staff directory:
- Search and filter by category
- Show profile photo, name, role, availability
- Multi-select capability
- Option to assign to entire journey or specific days
- Show if staff is already assigned to journey

### 5. Day-Specific Staff Assignment (MEDIUM PRIORITY)
Update DayStaffAssignmentModal.tsx to:
- Load staff from master_staff (via journey_staff)
- Show which days each staff is assigned to
- Visual calendar/timeline view
- Drag-and-drop for day assignments
- Conflict detection (same person, multiple assignments)

### 6. Staff Detail View (MEDIUM PRIORITY)
Create comprehensive detail view showing:
- Full profile information
- All documents with download links
- Image gallery
- Linked user information (if applicable)
- Journey assignment history
- Edit capabilities for all sections

### 7. Document and Image Management (MEDIUM PRIORITY)
Create components for:
- Document upload with file type selection
- Image upload with crop/resize
- Document list with download buttons
- Image gallery with lightbox
- Delete functionality
- Storage bucket integration

## How the System Works

### Creating a User Without Staff Record:
1. Admin creates user in UserManagement
2. Leave "Add to Staff Directory" unchecked
3. User is created in `users` table only
4. `is_staff_member` = false

### Creating a User With Staff Record:
1. Admin creates user in UserManagement
2. Check "Add to Staff Directory"
3. Fill in staff-specific fields
4. User is created in `users` table with `is_staff_member=true`
5. Trigger auto-creates linked `master_staff` record
6. Files are uploaded to storage buckets
7. Records created in `staff_documents` and `staff_images` tables

### Creating Staff Without User Account:
1. Admin goes to Staff Directory page
2. Clicks "Add Staff Member"
3. Fills in staff information
4. Does NOT link to user account
5. Staff record created in `master_staff` only
6. Can optionally link to user later

### Assigning Staff to Journey:
1. Open journey in JourneyEditor
2. Go to Staff tab
3. Click "Add Staff from Directory"
4. Select staff members from master_staff
5. Choose assignment scope (entire journey or specific days)
6. System creates `journey_staff` records with `master_staff_id` reference
7. Journey-specific data stored in `journey_staff`
8. Personal info pulled from `master_staff`

### Day-Specific Assignments:
1. For each journey day, admin can assign staff
2. Staff assignments stored in `journey_staff_day_assignments`
3. Example: Ahmed (guide) for all days, Mazin (guide) for Days 2-3 only
4. Visual calendar shows assignments
5. Reports can filter by day, staff member, or role

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       users table                            │
│  (authentication accounts with is_staff_member flag)         │
└─────────────────┬───────────────────────────────────────────┘
                  │ user_id (if is_staff_member=true)
                  │ Bidirectional sync ↕
                  ↓
┌─────────────────────────────────────────────────────────────┐
│                   master_staff table                         │
│  (master directory of all staff with category)               │
│  - Profile info, contact, documents, images                  │
│  - Can exist without user_id (non-user staff)               │
└─────────────────┬───────────────────────────────────────────┘
                  │ master_staff_id
                  ↓
┌─────────────────────────────────────────────────────────────┐
│                   journey_staff table                        │
│  (staff assigned to specific journeys)                       │
│  - References master_staff_id                                │
│  - Stores journey-specific data (payment, status, etc.)     │
└─────────────────┬───────────────────────────────────────────┘
                  │ staff_id
                  ↓
┌─────────────────────────────────────────────────────────────┐
│            journey_staff_day_assignments                     │
│  (staff assigned to specific days within journey)            │
│  - Links staff to specific itinerary days                    │
└─────────────────────────────────────────────────────────────┘
```

## Benefits of This System

1. **No Duplicates**: Unique constraint on user_id prevents duplicate staff records
2. **Single Source of Truth**: master_staff is the authoritative staff directory
3. **Flexible**: Staff can exist without user accounts (contractors, externals)
4. **Automatic Sync**: Changes to user profile sync to staff record and vice versa
5. **Journey-Specific Data**: Payment and assignment details stored separately
6. **Day-Level Control**: Assign different staff to different days
7. **Categorization**: Staff organized by category for easy filtering
8. **Document Management**: Multiple documents and images per staff member
9. **Proper Permissions**: RLS policies ensure data security

## Next Steps

1. **Immediate**: Reset passwords for the 4 users manually
2. **High Priority**: Build the remaining modals (Add/Edit Staff, Enhanced User Creation)
3. **Medium Priority**: Refactor existing staff assignment flows
4. **Low Priority**: Add advanced features (reports, analytics, history)

## Testing Checklist

Once all components are built, test:
- [ ] Create user without staff checkbox → verify no master_staff created
- [ ] Create user with staff checkbox → verify master_staff auto-created
- [ ] Update user profile → verify master_staff syncs
- [ ] Update master_staff → verify user syncs (if linked)
- [ ] Create staff without user → verify standalone master_staff works
- [ ] Link existing staff to user → verify sync starts working
- [ ] Assign staff to journey → verify journey_staff references master_staff
- [ ] Assign staff to specific days → verify day assignments work
- [ ] Upload documents and images → verify storage and RLS work
- [ ] Delete user → verify master_staff.user_id set to NULL (not deleted)
- [ ] Filter and search in Staff Directory → verify all filters work
