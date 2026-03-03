/*
  # Remove Orphaned Auth User

  This migration removes any auth users that don't have corresponding records
  in the users table, allowing them to sign up fresh.

  ## Changes
  - Deletes auth.users records that have no matching users table record
*/

-- Delete orphaned auth users (those without a matching record in users table)
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM users);
