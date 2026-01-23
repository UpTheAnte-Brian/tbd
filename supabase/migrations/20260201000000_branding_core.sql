-- -----------------------------------------------------------------------------
-- Branding core: schema + base tables/functions required by later branding migrations
-- -----------------------------------------------------------------------------
begin;

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

create schema if not exists branding;

-- If you already have this function elsewhere, this is harmless due to OR REPLACE
create or replace function branding.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Minimal palettes table that later migrations depend on.
-- Adjust columns later as needed, but keep id + colors available for backfills.
create table if not exists branding.palettes (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid null,
  role text not null,
  colors jsonb null, -- legacy jsonb array of hex strings used by split_colors migration
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Common uniqueness used throughout your branding work
create unique index if not exists palettes_entity_role_uidx
  on branding.palettes (entity_id, role);

drop trigger if exists trg_touch_branding_palettes on branding.palettes;
create trigger trg_touch_branding_palettes
before update on branding.palettes
for each row execute function branding.touch_updated_at();

commit;
