/*
  # Safely Optimize RLS Policies

  Updates all RLS policies to use (select auth.uid()) pattern
  Handles policies with USING, WITH CHECK, or both clauses
*/

DO $$
DECLARE
  policy_rec RECORD;
  cmd_type TEXT;
  new_using TEXT;
  new_check TEXT;
  has_changes BOOLEAN;
BEGIN
  FOR policy_rec IN
    SELECT 
      pp.schemaname,
      pp.tablename,
      pp.policyname,
      pol.polcmd,
      pg_get_expr(pol.polqual, pol.polrelid) as qual_expr,
      pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expr
    FROM pg_policies pp
    JOIN pg_policy pol ON pol.polname = pp.policyname
    JOIN pg_class pc ON pol.polrelid = pc.oid AND pc.relname = pp.tablename
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid AND pn.nspname = pp.schemaname
    WHERE pp.schemaname = 'public'
    AND (
      (pg_get_expr(pol.polqual, pol.polrelid) IS NOT NULL 
       AND pg_get_expr(pol.polqual, pol.polrelid) ~ 'auth\.uid\(\)')
      OR 
      (pg_get_expr(pol.polwithcheck, pol.polrelid) IS NOT NULL 
       AND pg_get_expr(pol.polwithcheck, pol.polrelid) ~ 'auth\.uid\(\)')
    )
  LOOP
    cmd_type := CASE policy_rec.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END;
    
    has_changes := false;
    
    -- Handle USING clause
    IF policy_rec.qual_expr IS NOT NULL THEN
      new_using := regexp_replace(policy_rec.qual_expr, '\yauth\.uid\(\)', '(select auth.uid())', 'g');
      IF new_using != policy_rec.qual_expr THEN
        has_changes := true;
      END IF;
    ELSE
      new_using := NULL;
    END IF;
    
    -- Handle WITH CHECK clause
    IF policy_rec.check_expr IS NOT NULL THEN
      new_check := regexp_replace(policy_rec.check_expr, '\yauth\.uid\(\)', '(select auth.uid())', 'g');
      IF new_check != policy_rec.check_expr THEN
        has_changes := true;
      END IF;
    ELSE
      new_check := NULL;
    END IF;
    
    -- Skip if no changes needed
    IF NOT has_changes THEN
      CONTINUE;
    END IF;
    
    -- Drop old policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      policy_rec.policyname,
      policy_rec.schemaname,
      policy_rec.tablename
    );
    
    -- Recreate with optimized expression
    IF new_using IS NOT NULL AND new_check IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR %s TO authenticated USING (%s) WITH CHECK (%s)',
        policy_rec.policyname,
        policy_rec.schemaname,
        policy_rec.tablename,
        cmd_type,
        new_using,
        new_check
      );
    ELSIF new_using IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR %s TO authenticated USING (%s)',
        policy_rec.policyname,
        policy_rec.schemaname,
        policy_rec.tablename,
        cmd_type,
        new_using
      );
    ELSIF new_check IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR %s TO authenticated WITH CHECK (%s)',
        policy_rec.policyname,
        policy_rec.schemaname,
        policy_rec.tablename,
        cmd_type,
        new_check
      );
    END IF;
    
    RAISE NOTICE 'Updated policy: %.%', policy_rec.tablename, policy_rec.policyname;
  END LOOP;
END $$;
