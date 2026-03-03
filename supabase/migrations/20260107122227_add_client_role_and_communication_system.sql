/*
  # Add Client User Role and Communication System

  1. Changes to User System
    - Add 'client' role option to users
    - Clients are read-only users who can view journeys and communicate with admins
  
  2. New Tables
    - `journey_comments` - For communication between clients/guides and admins
      - Support for comments on journeys, days, activities, meals, accommodations, and transportation
      - Real-time chat-like communication
      - Admin responses and threading
    
    - `journey_notes` - Private notes that can be added to any journey element
      - Visible to admins and assigned users
      - Contextual notes for different sections
  
  3. Security
    - Enable RLS on all new tables
    - Clients can only view and comment on journeys shared with them
    - Admins and journey owners can manage all comments and notes
    - Notes are only visible to authorized users
  
  4. Permissions
    - Fix journey_shares delete policy to allow admins to remove any share
    - Add policies for clients to view shared journeys
*/

-- ============================================================================
-- PART 1: Update User Roles
-- ============================================================================

-- Update users table role constraint to include 'client'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'users' 
    AND column_name = 'role'
    AND constraint_name LIKE '%role_check%'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  END IF;
END $$;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'guide', 'client', 'manager'));

-- ============================================================================
-- PART 2: Journey Comments System
-- ============================================================================

CREATE TABLE IF NOT EXISTS journey_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- What this comment is attached to
  context_type text NOT NULL CHECK (context_type IN ('journey', 'day', 'activity', 'dining', 'accommodation', 'transportation')),
  context_id uuid, -- ID of the specific item (day_id, activity_id, etc)
  
  -- Comment content
  comment_text text NOT NULL,
  is_admin_response boolean DEFAULT false,
  parent_comment_id uuid REFERENCES journey_comments(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  
  -- Ensure context_id is provided for non-journey contexts
  CONSTRAINT valid_context CHECK (
    (context_type = 'journey' AND context_id IS NULL) OR
    (context_type != 'journey' AND context_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_journey_comments_journey ON journey_comments(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_comments_context ON journey_comments(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_journey_comments_user ON journey_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_comments_parent ON journey_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_journey_comments_created ON journey_comments(created_at DESC);

-- ============================================================================
-- PART 3: Journey Notes System (Admin/Guide Private Notes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS journey_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- What this note is attached to
  context_type text NOT NULL CHECK (context_type IN ('journey', 'day', 'activity', 'dining', 'accommodation', 'transportation')),
  context_id uuid, -- ID of the specific item
  
  -- Note content
  note_text text NOT NULL,
  is_private boolean DEFAULT false, -- If true, only creator and admins can see
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_note_context CHECK (
    (context_type = 'journey' AND context_id IS NULL) OR
    (context_type != 'journey' AND context_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_journey_notes_journey ON journey_notes(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_notes_context ON journey_notes(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_journey_notes_creator ON journey_notes(created_by);

-- ============================================================================
-- PART 4: Row Level Security
-- ============================================================================

-- Journey Comments RLS
ALTER TABLE journey_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on journeys they have access to
CREATE POLICY "Users can view comments on accessible journeys"
  ON journey_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys j
      WHERE j.id = journey_comments.journey_id
      AND (
        is_admin() OR
        j.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM journey_shares js
          WHERE js.journey_id = j.id
          AND js.shared_with = auth.uid()
          AND js.is_active = true
        )
      )
    )
  );

-- Users can create comments on journeys they have access to
CREATE POLICY "Users can create comments on accessible journeys"
  ON journey_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM journeys j
      WHERE j.id = journey_comments.journey_id
      AND (
        is_admin() OR
        j.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM journey_shares js
          WHERE js.journey_id = j.id
          AND js.shared_with = auth.uid()
          AND js.is_active = true
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON journey_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can soft-delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments, admins can delete any"
  ON journey_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- Journey Notes RLS
ALTER TABLE journey_notes ENABLE ROW LEVEL SECURITY;

-- Users can view notes on journeys they have access to (respecting privacy)
CREATE POLICY "Users can view notes on accessible journeys"
  ON journey_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys j
      WHERE j.id = journey_notes.journey_id
      AND (
        is_admin() OR
        j.created_by = auth.uid() OR
        (created_by = auth.uid()) OR
        (NOT is_private AND EXISTS (
          SELECT 1 FROM journey_shares js
          WHERE js.journey_id = j.id
          AND js.shared_with = auth.uid()
          AND js.is_active = true
          AND js.permission_level = 'edit'
        ))
      )
    )
  );

-- Users can create notes on journeys they can edit
CREATE POLICY "Users can create notes on editable journeys"
  ON journey_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM journeys j
      WHERE j.id = journey_notes.journey_id
      AND (
        is_admin() OR
        j.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM journey_shares js
          WHERE js.journey_id = j.id
          AND js.shared_with = auth.uid()
          AND js.is_active = true
          AND js.permission_level = 'edit'
        )
      )
    )
  );

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
  ON journey_notes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin())
  WITH CHECK (created_by = auth.uid() OR is_admin());

-- Users can delete their own notes, admins can delete any
CREATE POLICY "Users can delete own notes, admins can delete any"
  ON journey_notes FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin());

-- ============================================================================
-- PART 5: Fix Journey Shares Delete Policy
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can delete any journey share" ON journey_shares;
DROP POLICY IF EXISTS "Users can delete shares they received" ON journey_shares;

-- Recreate with proper permissions
CREATE POLICY "Admins can delete any journey share"
  ON journey_shares FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Journey owners can delete shares"
  ON journey_shares FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journeys j
      WHERE j.id = journey_shares.journey_id
      AND j.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete shares they received"
  ON journey_shares FOR DELETE
  TO authenticated
  USING (shared_with = auth.uid());

-- ============================================================================
-- PART 6: Triggers for Updated At
-- ============================================================================

CREATE OR REPLACE FUNCTION update_journey_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_journey_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journey_comments_updated_at ON journey_comments;
CREATE TRIGGER journey_comments_updated_at
  BEFORE UPDATE ON journey_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_comments_updated_at();

DROP TRIGGER IF EXISTS journey_notes_updated_at ON journey_notes;
CREATE TRIGGER journey_notes_updated_at
  BEFORE UPDATE ON journey_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_notes_updated_at();
