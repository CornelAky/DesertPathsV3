/*
  # Allow managers to create and manage master staff records
  
  1. Changes
    - Add policy to allow managers to insert master_staff records
    - Add policy to allow managers to update master_staff records
    
  2. Reason
    - Currently only admins can create master_staff records
    - When managers add staff via "Add Staff" button, the system tries to create master_staff record
    - This was failing due to RLS restrictions
    - Managers need this permission to make staff reusable across journeys
*/

-- Allow managers to insert master staff
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'master_staff' 
    AND policyname = 'Managers can insert master staff'
  ) THEN
    CREATE POLICY "Managers can insert master staff"
      ON master_staff
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'manager')
        )
      );
  END IF;
END $$;

-- Allow managers to update master staff
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'master_staff' 
    AND policyname = 'Managers can update master staff'
  ) THEN
    CREATE POLICY "Managers can update master staff"
      ON master_staff
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'manager')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'manager')
        )
      );
  END IF;
END $$;