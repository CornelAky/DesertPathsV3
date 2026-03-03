/*
  # Make user_email nullable in activity log

  1. Changes
    - Make user_email column nullable in itinerary_activity_log table
    - This prevents errors when the user email cannot be determined
    - System actions can proceed without requiring an email
    
  2. Security
    - No changes to RLS policies
    - Maintains data integrity for other required fields
*/

-- Make user_email nullable to prevent constraint violations
ALTER TABLE itinerary_activity_log 
ALTER COLUMN user_email DROP NOT NULL;
