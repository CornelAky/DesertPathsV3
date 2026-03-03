/*
  # Auto-sync day dates when journey start date changes

  1. Changes
    - Creates a trigger function to automatically update all day dates when a journey's start_date is modified
    - Calculates each day's date based on: start_date + (day_number - 1) days
    - Ensures dates stay synchronized across the system

  2. Benefits
    - Automatic synchronization of dates
    - Prevents data inconsistencies
    - Works even if frontend logic is bypassed
*/

CREATE OR REPLACE FUNCTION sync_itinerary_day_dates()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.start_date IS DISTINCT FROM NEW.start_date AND NEW.start_date IS NOT NULL THEN
    UPDATE itinerary_days
    SET date = (NEW.start_date::date + (day_number - 1))::date
    WHERE journey_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_day_dates_on_journey_update ON journeys;

CREATE TRIGGER sync_day_dates_on_journey_update
  AFTER UPDATE ON journeys
  FOR EACH ROW
  WHEN (OLD.start_date IS DISTINCT FROM NEW.start_date)
  EXECUTE FUNCTION sync_itinerary_day_dates();
