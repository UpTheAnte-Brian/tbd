create table if not exists public.nonprofits (
  id uuid not null default gen_random_uuid(),
  entity_id uuid not null,
  name text not null,
  ein text null,
  org_type public.org_type not null,
  mission_statement text null,
  website_url text null,
  logo_url text null,
  address text null,
  contact_email text null,
  contact_phone text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nonprofits_pkey primary key (id),
  constraint nonprofits_ein_key unique (ein),
  constraint nonprofits_entity_id_fk
    foreign key (entity_id)
    references public.entities (id)
    on delete cascade
);

create index if not exists nonprofits_org_type_idx
  on public.nonprofits using btree (org_type);

create index if not exists nonprofits_active_idx
  on public.nonprofits using btree (active);

create unique index if not exists nonprofits_entity_id_uidx
  on public.nonprofits using btree (entity_id);

drop trigger if exists set_nonprofits_updated_at on public.nonprofits;

create trigger set_nonprofits_updated_at
before update on public.nonprofits
for each row
execute function public.set_updated_at();


alter table public.nonprofits enable row level security;

-- -----------------------------------------------------------------------------
-- Compatibility shim: some environments only have the 2-arg helper
--   public.is_entity_admin(entity_id uuid, user_id uuid)
-- while policies in this project typically call the 1-arg form:
--   public.is_entity_admin(entity_id uuid)
-- Create the 1-arg wrapper when missing.
-- -----------------------------------------------------------------------------
DO $$
begin
  if to_regprocedure('public.is_entity_admin(uuid)') is null
     and to_regprocedure('public.is_entity_admin(uuid,uuid)') is not null then

    create or replace function public.is_entity_admin(p_entity_id uuid)
    returns boolean
    language sql
    stable
    security invoker
    as $fn$
      select public.is_entity_admin(p_entity_id, auth.uid());
    $fn$;

    -- Make the wrapper callable from client roles (matches existing helper usage)
    grant execute on function public.is_entity_admin(uuid) to authenticated;
  end if;
end $$;

-- Read: anyone who can read the entity
drop policy if exists nonprofits_read on public.nonprofits;
create policy nonprofits_read
on public.nonprofits
for select
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(entity_id)
);

-- Insert: entity admins only
drop policy if exists nonprofits_insert on public.nonprofits;
create policy nonprofits_insert
on public.nonprofits
for insert
with check (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(entity_id)
);

-- Update: entity admins only
drop policy if exists nonprofits_update on public.nonprofits;
create policy nonprofits_update
on public.nonprofits
for update
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(entity_id)
);

-- Delete: entity admins only
drop policy if exists nonprofits_delete on public.nonprofits;
create policy nonprofits_delete
on public.nonprofits
for delete
using (
  public.is_global_admin(auth.uid())
  or public.is_entity_admin(entity_id)
);

-- Grants
grant select, insert, update, delete on table public.nonprofits to authenticated;