/*
  # Create System Settings Table

  1. New Tables
    - `system_settings`
      - `id` (uuid, primary key)
      - `setting_key` (text, unique) - The setting identifier
      - `setting_value` (jsonb) - The setting value (supports complex objects)
      - `description` (text) - Human-readable description
      - `category` (text) - Group settings by category
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid) - References users.id

  2. Security
    - Enable RLS on `system_settings` table
    - Only admins can view settings
    - Only admins can modify settings

  3. Initial Data
    - Insert default activity time period settings
*/

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

CREATE POLICY "Admins can insert settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

CREATE POLICY "Admins can update settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

INSERT INTO system_settings (setting_key, setting_value, description, category) VALUES
  (
    'activity_time_periods',
    '{
      "early_morning": {"start": "05:00", "end": "07:00", "label": "Early Morning"},
      "morning": {"start": "07:00", "end": "12:00", "label": "Morning"},
      "afternoon": {"start": "12:00", "end": "17:00", "label": "Afternoon"},
      "evening": {"start": "17:00", "end": "20:00", "label": "Evening"},
      "night": {"start": "20:00", "end": "23:59", "label": "Night"}
    }'::jsonb,
    'Time period definitions for activity sections',
    'activities'
  )
ON CONFLICT (setting_key) DO NOTHING;
