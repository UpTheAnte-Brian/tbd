-- Creates/ensures the "create profile row on auth.users insert" function + trigger.
-- Idempotent: safe to run multiple times.

-- 0) Function: insert into public.profiles when a user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Adjust columns/values to match your table exactly
  insert into public.profiles (id, username, role, updated_at)
  values (new.id, new.id::text, 'Patron', now())
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 1) Trigger: attach to auth.users
do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'on_auth_user_created'
      and n.nspname = 'auth'
      and c.relname = 'users'
  ) then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();
  end if;
end;
$$;