/*
  # Clean Up Users and Reset Passwords
  
  1. Actions
    - Delete all users except the 4 specified ones
    - Keep: info@desertpaths.co, sales@desertpaths.co, gabriel@desertpaths.co, gabiromanian@yahoo.com
    - Reset passwords for these 4 users to: Tourblox2026
  
  2. Security
    - This migration cleans up redundant user accounts
    - Preserves essential admin, guide, and client accounts
*/

-- Delete all users except the 4 specified ones
-- Note: We cannot delete from auth.users directly, we delete from public.users
-- and the auth.users will need to be manually cleaned up via Supabase dashboard
DELETE FROM users
WHERE email NOT IN (
  'info@desertpaths.co',
  'sales@desertpaths.co',
  'gabriel@desertpaths.co',
  'gabiromanian@yahoo.com'
);

-- Note: Password reset must be done via Supabase Auth API or Dashboard
-- The passwords cannot be set directly in SQL for security reasons
-- After running this migration, admin must:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Delete auth.users entries that don't match the 4 emails above
-- 3. For each of the 4 users, click "..." > Reset Password
-- 4. Set password to: Tourblox2026
