drop extension if exists "pg_net";

drop policy "Users can upsert own profile" on "public"."profiles";

drop policy "Users can update own profile" on "public"."profiles";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  claims jsonb;
begin
  -- Start with existing claims
  claims := event->'claims';

  -- Safest: only trust app_metadata.role
  if (event->'user'->'app_metadata'->>'role') is not null then
    claims := jsonb_set(claims, '{role}', to_jsonb(event->'user'->'app_metadata'->>'role'));
  end if;

  -- Return event with updated claims
  return jsonb_set(event, '{claims}', claims);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_profiles_and_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  -- Upsert into profiles
  insert into public.profiles (
    id, full_name, first_name, last_name, username, website, avatar_url, updated_at, role
  )
  values (
    new.id,
    new.full_name,
    new.first_name,
    new.last_name,
    new.username,
    new.website,
    new.avatar_url,
    coalesce(new.updated_at, now()),
    new.role
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    first_name = excluded.first_name,
    last_name  = excluded.last_name,
    username   = excluded.username,
    website    = excluded.website,
    avatar_url = excluded.avatar_url,
    updated_at = excluded.updated_at,
    role = excluded.role;

  -- Upsert into user_roles
  -- if new.role is not null then
  --   insert into public.user_roles (user_id, role)
  --   values (new.id, new.role)
  --   on conflict (id) do update
  --     set role = excluded.role;
  -- end if;

  return new;
end;
$function$
;

create or replace view "public"."user_profiles_with_roles" as  SELECT p.id,
    p.full_name,
    p.first_name,
    p.last_name,
    p.username,
    p.website,
    p.avatar_url,
    p.updated_at,
    p.role
   FROM profiles p;



  create policy "Allow users and admins to insert profiles"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));



  create policy "Allow users and admins to update profiles"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using (((auth.uid() = id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)))
with check (true);



  create policy "Enable insert for authenticated users only"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check (((auth.jwt() ->> 'role'::text) = 'admin'::text));



  create policy "Users can insert own profile; admins any"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using (((auth.uid() = id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));



