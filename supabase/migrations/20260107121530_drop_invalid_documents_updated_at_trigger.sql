/*
  # Drop Invalid Documents Updated At Trigger

  1. Issue
    - The trigger `update_journey_documents_updated_at()` tries to update a non-existent column `documents_updated_at` in the journeys table
    - This causes errors when updating journey_documents, including during user data transfers
  
  2. Solution
    - Drop the trigger from journey_documents table
    - Drop the function that updates the non-existent column
  
  3. Impact
    - Removes a broken trigger that was causing errors
    - No functionality is lost since the column it was trying to update doesn't exist
*/

-- Drop the trigger first
DROP TRIGGER IF EXISTS journey_documents_updated_at ON journey_documents;

-- Drop the function
DROP FUNCTION IF EXISTS update_journey_documents_updated_at();
