/*
  # Make First User Admin Automatically

  ## Changes
  - Create a function that automatically assigns 'admin' role to the first user
  - Create a trigger that runs on INSERT to public.users
  - If no other users exist, the new user becomes an admin
*/

-- Create function to set first user as admin
CREATE OR REPLACE FUNCTION set_first_user_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Count existing users (excluding the one being inserted)
  IF (SELECT COUNT(*) FROM public.users) = 0 THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before insert
DROP TRIGGER IF EXISTS trigger_first_user_admin ON public.users;
CREATE TRIGGER trigger_first_user_admin
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION set_first_user_as_admin();
