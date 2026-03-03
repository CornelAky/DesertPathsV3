/*
  # Optimize Day Card Query Performance

  ## Overview
  Adds indices to improve query performance for day card data loading,
  particularly for activities and dining that are ordered by time fields.

  ## Changes
  1. Add index on activities.activity_time for faster ordering
  2. Add index on dining.reservation_time for faster ordering
  3. Add index on activities.display_order for faster ordering
  4. Add index on dining.display_order for faster ordering

  ## Performance Impact
  - Day card queries should be significantly faster
  - Activities and dining will load quickly even with many records
*/

-- Add index for activities ordered by activity_time
CREATE INDEX IF NOT EXISTS idx_activities_activity_time 
  ON activities(day_id, activity_time);

-- Add index for activities ordered by display_order
CREATE INDEX IF NOT EXISTS idx_activities_display_order 
  ON activities(day_id, display_order);

-- Add index for dining ordered by reservation_time
CREATE INDEX IF NOT EXISTS idx_dining_reservation_time 
  ON dining(day_id, reservation_time);

-- Add index for dining ordered by display_order
CREATE INDEX IF NOT EXISTS idx_dining_display_order 
  ON dining(day_id, display_order);
