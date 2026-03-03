/*
  # Add Document Notifications and Activity Tracking

  ## Overview
  Implements a comprehensive notification and activity tracking system for trip documents
  to keep admins and guides informed of changes without manual communication.

  ## Changes
  
  ### 1. New Tables
    - `trip_document_views` - Tracks when users view/download documents
    - `trip_document_activities` - Activity feed for all document-related actions
    - `trip_notifications` - Notification tracking for admins and guides
  
  ### 2. Functions
    - Helper function to check for unread documents
    - Trigger to create notifications on document upload
    - Trigger to create activity log entries
  
  ### 3. Security
    - Enable RLS on all new tables
    - Policies for admins and guides to view their notifications
*/

-- Create trip_document_views table
CREATE TABLE IF NOT EXISTS trip_document_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES trip_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, user_id)
);

-- Create trip_document_activities table
CREATE TABLE IF NOT EXISTS trip_document_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'document_uploaded',
    'document_deleted',
    'briefing_updated',
    'requirements_updated',
    'document_viewed'
  )),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create trip_notifications table
CREATE TABLE IF NOT EXISTS trip_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'new_document',
    'new_upload_from_guide',
    'briefing_updated',
    'requirements_updated'
  )),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  related_document_id UUID REFERENCES trip_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE trip_document_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_document_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_views_document_id ON trip_document_views(document_id);
CREATE INDEX IF NOT EXISTS idx_document_views_user_id ON trip_document_views(user_id);
CREATE INDEX IF NOT EXISTS idx_document_activities_trip_id ON trip_document_activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_document_activities_created_at ON trip_document_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_user_id ON trip_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_trip_id ON trip_notifications(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_is_read ON trip_notifications(is_read);

-- RLS Policies for trip_document_views

-- Users can insert their own views
CREATE POLICY "Users can insert own document views"
  ON trip_document_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can view their own views
CREATE POLICY "Users can view own document views"
  ON trip_document_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all document views
CREATE POLICY "Admins can view all document views"
  ON trip_document_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

-- RLS Policies for trip_document_activities

-- Admins can view all activities
CREATE POLICY "Admins can view all trip activities"
  ON trip_document_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

-- Guides can view activities for their shared trips
CREATE POLICY "Guides can view activities for shared trips"
  ON trip_document_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'guide'
      AND users.status = 'active'
    )
    AND (
      EXISTS (
        SELECT 1 FROM trip_shares
        WHERE trip_shares.trip_id = trip_document_activities.trip_id
        AND trip_shares.shared_with = auth.uid()
        AND trip_shares.is_active = true
      )
      OR
      EXISTS (
        SELECT 1 FROM trip_assignments
        WHERE trip_assignments.trip_id = trip_document_activities.trip_id
        AND trip_assignments.user_id = auth.uid()
      )
    )
  );

-- Anyone can insert activities (will be restricted by application logic)
CREATE POLICY "Authenticated users can insert activities"
  ON trip_document_activities FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for trip_notifications

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON trip_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON trip_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert notifications (will be created by triggers or app)
CREATE POLICY "Authenticated users can insert notifications"
  ON trip_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON trip_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to get unread document count for a trip
CREATE OR REPLACE FUNCTION get_unread_document_count(p_trip_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  -- Count documents that haven't been viewed by the user
  SELECT COUNT(*)
  INTO unread_count
  FROM trip_documents td
  WHERE td.trip_id = p_trip_id
  AND NOT EXISTS (
    SELECT 1 FROM trip_document_views tdv
    WHERE tdv.document_id = td.id
    AND tdv.user_id = p_user_id
  )
  AND (
    -- If user is admin, count guide uploads
    (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = p_user_id
        AND u.role = 'admin'
      )
      AND td.upload_direction = 'guide_to_admin'
    )
    OR
    -- If user is guide, count admin uploads
    (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = p_user_id
        AND u.role = 'guide'
      )
      AND td.upload_direction = 'admin_to_guide'
    )
  );
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for document upload
CREATE OR REPLACE FUNCTION notify_document_upload()
RETURNS TRIGGER AS $$
DECLARE
  recipient_role TEXT;
  recipient_id UUID;
  notification_msg TEXT;
BEGIN
  -- Determine who should be notified
  IF NEW.upload_direction = 'admin_to_guide' THEN
    -- Notify guides assigned to this trip
    recipient_role := 'guide';
    notification_msg := 'Admin has uploaded new documents';
    
    -- Create notifications for all assigned guides
    INSERT INTO trip_notifications (trip_id, user_id, notification_type, message, related_document_id)
    SELECT 
      NEW.trip_id,
      ts.shared_with,
      'new_document',
      notification_msg,
      NEW.id
    FROM trip_shares ts
    WHERE ts.trip_id = NEW.trip_id
    AND ts.is_active = true
    UNION
    SELECT 
      NEW.trip_id,
      ta.user_id,
      'new_document',
      notification_msg,
      NEW.id
    FROM trip_assignments ta
    WHERE ta.trip_id = NEW.trip_id;
    
  ELSE
    -- Notify admins about guide upload
    notification_msg := 'Guide has uploaded new files';
    
    -- Create notifications for all admins
    INSERT INTO trip_notifications (trip_id, user_id, notification_type, message, related_document_id)
    SELECT 
      NEW.trip_id,
      u.id,
      'new_upload_from_guide',
      notification_msg,
      NEW.id
    FROM users u
    WHERE u.role = 'admin'
    AND u.status = 'active';
  END IF;
  
  -- Create activity log entry
  INSERT INTO trip_document_activities (trip_id, user_id, action_type, details)
  VALUES (
    NEW.trip_id,
    NEW.uploaded_by,
    'document_uploaded',
    jsonb_build_object(
      'document_id', NEW.id,
      'file_name', NEW.file_name,
      'category', NEW.document_category,
      'direction', NEW.upload_direction
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for document upload notifications
DROP TRIGGER IF EXISTS trigger_notify_document_upload ON trip_documents;
CREATE TRIGGER trigger_notify_document_upload
  AFTER INSERT ON trip_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_upload();

-- Function to log trip field updates
CREATE OR REPLACE FUNCTION log_trip_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if special_requirements was updated
  IF OLD.special_requirements IS DISTINCT FROM NEW.special_requirements THEN
    -- Log activity
    INSERT INTO trip_document_activities (trip_id, user_id, action_type, details)
    VALUES (
      NEW.id,
      auth.uid(),
      'requirements_updated',
      jsonb_build_object('message', 'Special requirements updated')
    );
    
    -- Notify guides
    INSERT INTO trip_notifications (trip_id, user_id, notification_type, message)
    SELECT 
      NEW.id,
      ts.shared_with,
      'requirements_updated',
      'Admin has updated special requirements'
    FROM trip_shares ts
    WHERE ts.trip_id = NEW.id
    AND ts.is_active = true
    UNION
    SELECT 
      NEW.id,
      ta.user_id,
      'requirements_updated',
      'Admin has updated special requirements'
    FROM trip_assignments ta
    WHERE ta.trip_id = NEW.id;
  END IF;
  
  -- Check if manager_briefing was updated
  IF OLD.manager_briefing IS DISTINCT FROM NEW.manager_briefing THEN
    -- Log activity
    INSERT INTO trip_document_activities (trip_id, user_id, action_type, details)
    VALUES (
      NEW.id,
      auth.uid(),
      'briefing_updated',
      jsonb_build_object('message', 'Manager briefing updated')
    );
    
    -- Notify guides
    INSERT INTO trip_notifications (trip_id, user_id, notification_type, message)
    SELECT 
      NEW.id,
      ts.shared_with,
      'briefing_updated',
      'Admin has updated the briefing notes'
    FROM trip_shares ts
    WHERE ts.trip_id = NEW.id
    AND ts.is_active = true
    UNION
    SELECT 
      NEW.id,
      ta.user_id,
      'briefing_updated',
      'Admin has updated the briefing notes'
    FROM trip_assignments ta
    WHERE ta.trip_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for trip updates
DROP TRIGGER IF EXISTS trigger_log_trip_updates ON trips;
CREATE TRIGGER trigger_log_trip_updates
  AFTER UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION log_trip_updates();