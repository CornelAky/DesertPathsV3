/*
  # Add Heritage Specialist to Staff Roles
  
  1. Overview
    Adds a new specialized role "Heritage Specialist" to the staff role options.
    This role is for staff members who specialize in cultural heritage,
    historical sites, and archaeological expertise.
  
  2. Changes
    - Adds 'heritage_specialist' to the staff_role_type enum
  
  3. Impact
    - Available when adding new staff members
    - Available when selecting staff from master list
    - Displayed in staff lists and itinerary summaries
*/

-- Add 'heritage_specialist' to the staff_role_type enum
ALTER TYPE staff_role_type ADD VALUE IF NOT EXISTS 'heritage_specialist';