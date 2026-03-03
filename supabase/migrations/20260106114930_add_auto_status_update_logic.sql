/*
  # Add Auto-Status Update Logic

  ## Overview
  Automatically update journey status based on dates:
  - When start_date is reached: set to 'live' (if not already completed or canceled)
  - When end_date is passed: set to 'completed' (if status is 'live')

  ## Changes
  1. Create function to check and update status based on dates
  2. Create trigger to run on journey updates
  3. This helps keep statuses accurate without manual updates
  
  ## Security
  - Function uses SECURITY DEFINER to bypass RLS
  - Only updates status field based on date logic
*/

-- Create function to auto-update status based on dates
CREATE OR REPLACE FUNCTION auto_update_journey_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only auto-update if dates are set
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    -- If journey has started and status is before 'live', update to 'live'
    -- (but don't change if already completed or canceled)
    IF CURRENT_DATE >= NEW.start_date 
       AND CURRENT_DATE <= NEW.end_date
       AND NEW.status NOT IN ('live', 'completed', 'canceled') THEN
      NEW.status := 'live';
    END IF;
    
    -- If journey has ended and status is 'live', update to 'completed'
    IF CURRENT_DATE > NEW.end_date AND NEW.status = 'live' THEN
      NEW.status := 'completed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert or update
DROP TRIGGER IF EXISTS auto_update_journey_status_trigger ON journeys;
CREATE TRIGGER auto_update_journey_status_trigger
  BEFORE INSERT OR UPDATE OF start_date, end_date, status
  ON journeys
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_journey_status();

-- Add comment for documentation
COMMENT ON FUNCTION auto_update_journey_status() IS 'Automatically updates journey status to live when start_date is reached, and to completed when end_date has passed';
