/*
  # Add N/A Option to Payment Fields

  1. Changes
    - Add 'n/a' option to activities.payment_status constraint
    - Add 'n/a' option to dining.payment_arrangement constraint
    
  2. Notes
    - This allows marking items as not applicable for payment tracking
    - Useful when certain activities or meals don't require payment status tracking
*/

-- Drop and recreate the payment_status constraint on activities
DO $$
BEGIN
  -- Drop the existing constraint
  ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_payment_status_check;
  
  -- Add the new constraint with 'n/a' option
  ALTER TABLE activities ADD CONSTRAINT activities_payment_status_check 
    CHECK (payment_status IN ('prepaid', 'pay_onsite', 'pending', 'n/a'));
END $$;

-- Drop and recreate the payment_arrangement constraint on dining
DO $$
BEGIN
  -- Drop the existing constraint
  ALTER TABLE dining DROP CONSTRAINT IF EXISTS dining_payment_arrangement_check;
  
  -- Add the new constraint with 'n/a' option
  ALTER TABLE dining ADD CONSTRAINT dining_payment_arrangement_check 
    CHECK (payment_arrangement IN ('full', 'partial', 'not_paid', 'n/a'));
END $$;