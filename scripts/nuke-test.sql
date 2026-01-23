-- Fallback: drop and recreate schemas for TEST (use only if CLI reset is blocked)

-- Terminate other connections to this database
select pg_terminate_backend(pid)
from pg_stat_activity
where datname = current_database()
  and pid <> pg_backend_pid();

-- Drop objects owned by common roles
DO $$
begin
  if exists (select 1 from pg_roles where rolname = 'postgres') then
    execute 'drop owned by postgres cascade';
  end if;
  if exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    execute 'drop owned by supabase_admin cascade';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    execute 'drop owned by authenticator cascade';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'drop owned by service_role cascade';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'drop owned by authenticated cascade';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'drop owned by anon cascade';
  end if;
end $$;

-- Drop schemas used by this project
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS branding CASCADE;
DROP SCHEMA IF EXISTS governance CASCADE;
DROP SCHEMA IF EXISTS storage CASCADE;

-- Recreate schemas
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS branding;
CREATE SCHEMA IF NOT EXISTS governance;
CREATE SCHEMA IF NOT EXISTS storage;

-- Re-grant defaults
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA branding TO public;
GRANT USAGE ON SCHEMA governance TO public;
GRANT USAGE ON SCHEMA storage TO public;

DO $$
begin
  if exists (select 1 from pg_roles where rolname = 'postgres') then
    execute 'grant all on schema public to postgres';
    execute 'grant all on schema branding to postgres';
    execute 'grant all on schema governance to postgres';
    execute 'grant all on schema storage to postgres';
  end if;
  if exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    execute 'grant all on schema public to supabase_admin';
    execute 'grant all on schema branding to supabase_admin';
    execute 'grant all on schema governance to supabase_admin';
    execute 'grant all on schema storage to supabase_admin';
  end if;
end $$;
