--------------------------------------------------------------------
-- 01_reset_rls.sql
-- Reset all policies & privileges in TEST before applying rebuild
--------------------------------------------------------------------

-- Enable RLS on all public tables
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END$$;

--------------------------------------------------------------------
-- Drop ALL existing policies across all schemas we care about
--------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I;',
      r.policyname, r.schemaname, r.tablename
    );
  END LOOP;
END$$;

--------------------------------------------------------------------
-- Reset basic GRANTS required by Supabase REST & Auth
--------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA storage TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage TO authenticated;

-- sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;