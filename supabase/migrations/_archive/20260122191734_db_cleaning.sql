

-- 20260122191734_db_cleaning.sql
-- Cleanup legacy tables and fix branding palettes schema drift.

begin;

-- -----------------------------------------------------------------------------
-- Drop legacy public tables (you crossed these out in the dashboard screenshots)
-- -----------------------------------------------------------------------------

drop table if exists public.channels cascade;
drop table if exists public.district_users cascade;
drop table if exists public.foundations cascade;
drop table if exists public.role_permissions cascade;
drop table if exists public.todos cascade;
drop table if exists public.user_roles cascade;

-- -----------------------------------------------------------------------------
-- Fix branding palettes schema
--
-- In test, `branding.palettes` already existed (older shape), so the create-table
-- in the earlier migration was skipped/failed. That leaves you with a palettes
-- table that doesn't match your route/types expectations.
--
-- We drop/recreate palettes + palette_colors with the intended columns.
-- -----------------------------------------------------------------------------

drop table if exists branding.palette_colors cascade;
drop table if exists branding.palettes cascade;

create table if not exists branding.palettes (
  id uuid not null default gen_random_uuid(),
  entity_id uuid not null,
  role branding.color_role not null,
  name text not null,
  usage_notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint palettes_pkey primary key (id),
  constraint branding_palettes_entity_role_unique unique (entity_id, role),
  constraint palettes_entity_id_fk foreign key (entity_id) references public.entities (id)
);

create table if not exists branding.palette_colors (
  id uuid not null default gen_random_uuid(),
  palette_id uuid not null,
  slot integer not null,
  hex text not null,
  label text null,
  usage_notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint palette_colors_pkey primary key (id),
  constraint palette_colors_palette_slot_unique unique (palette_id, slot),
  constraint palette_colors_palette_fk foreign key (palette_id) references branding.palettes (id) on delete cascade,
  constraint palette_colors_hex_format_check check ((hex ~* '^#[0-9a-f]{6}$'::text))
);

create index if not exists palettes_entity_id_idx on branding.palettes using btree (entity_id);
create index if not exists palette_colors_palette_id_idx on branding.palette_colors using btree (palette_id);

-- Keep updated_at current
-- `set_updated_at()` already exists in your migration history.
drop trigger if exists trg_palettes_updated_at on branding.palettes;
create trigger trg_palettes_updated_at
before update on branding.palettes
for each row execute function public.set_updated_at();

drop trigger if exists trg_palette_colors_updated_at on branding.palette_colors;
create trigger trg_palette_colors_updated_at
before update on branding.palette_colors
for each row execute function public.set_updated_at();

-- RLS + permissions
alter table branding.palettes enable row level security;
alter table branding.palette_colors enable row level security;

-- Read-only for anon/authenticated; writes via service_role
revoke all on table branding.palettes from anon, authenticated;
revoke all on table branding.palette_colors from anon, authenticated;

grant select on table branding.palettes to anon, authenticated;
grant select on table branding.palette_colors to anon, authenticated;

grant all on table branding.palettes to service_role;
grant all on table branding.palette_colors to service_role;

-- Policies (idempotent)
drop policy if exists branding_palettes_select on branding.palettes;
create policy branding_palettes_select on branding.palettes
for select to anon, authenticated
using (true);

drop policy if exists branding_palette_colors_select on branding.palette_colors;
create policy branding_palette_colors_select on branding.palette_colors
for select to anon, authenticated
using (true);

commit;