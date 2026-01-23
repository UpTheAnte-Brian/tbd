-- Core entity schema foundation (must run before any migrations that reference public.entities)
-- This file intentionally avoids depending on later schemas/tables (branding/governance/entity_types).

begin;

-- Extensions required for UUID + PostGIS geometry
create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ---------------------------------------------------------
-- Utility: set_updated_at() trigger function
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------
-- Core: entities
-- ---------------------------------------------------------
create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),

  -- Keep as text for now; later migrations can constrain via entity_types table / enums if desired.
  entity_type text not null,

  name text not null,
  slug text not null,

  active boolean not null default true,

  -- Flexible external identifiers by dataset/source (e.g. sdorgid, mde_orgid, etc.)
  external_ids jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Common uniqueness + lookup patterns
create unique index if not exists entities_entity_type_slug_key
  on public.entities (entity_type, slug);

create index if not exists entities_type_idx
  on public.entities (entity_type);

create index if not exists entities_type_id_idx
  on public.entities (entity_type, id);

create index if not exists entities_external_ids_gin
  on public.entities using gin (external_ids);

-- updated_at trigger
drop trigger if exists trg_entities_updated_at on public.entities;
create trigger trg_entities_updated_at
before update on public.entities
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Core: entity_relationships
-- ---------------------------------------------------------
create table if not exists public.entity_relationships (
  id uuid primary key default gen_random_uuid(),

  parent_entity_id uuid not null references public.entities(id) on delete cascade,
  child_entity_id  uuid not null references public.entities(id) on delete cascade,

  relationship_type text not null, -- e.g. 'contains'
  is_primary boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Prevent self-edges
  constraint entity_relationships_not_self
    check (parent_entity_id <> child_entity_id)
);

-- Uniqueness used heavily by your queries
create unique index if not exists entity_relationships_edge_uidx
  on public.entity_relationships (parent_entity_id, child_entity_id, relationship_type);

-- Query acceleration indexes (match your EXPLAIN patterns)
create index if not exists entity_relationships_parent_rel_child_idx
  on public.entity_relationships (parent_entity_id, relationship_type, child_entity_id);

create index if not exists entity_relationships_parent_idx
  on public.entity_relationships (parent_entity_id);

create index if not exists entity_relationships_child_idx
  on public.entity_relationships (child_entity_id);

create index if not exists entity_relationships_type_idx
  on public.entity_relationships (relationship_type);

-- Only one "primary" parent per (child, relationship_type)
create unique index if not exists entity_relationships_primary_uidx
  on public.entity_relationships (child_entity_id, relationship_type)
  where is_primary;

-- updated_at trigger
drop trigger if exists trg_entity_relationships_updated_at on public.entity_relationships;
create trigger trg_entity_relationships_updated_at
before update on public.entity_relationships
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Core: entity_geometries
-- ---------------------------------------------------------
create table if not exists public.entity_geometries (
  id uuid primary key default gen_random_uuid(),

  entity_id uuid not null references public.entities(id) on delete cascade,

  geometry_type text not null,    -- e.g. 'boundary', 'boundary_simplified', 'point', 'district_attendance_areas', 'school_program_locations'
  source text null,               -- dataset / provenance string

  -- PostGIS geometry (SRID can vary; you can enforce later if you want)
  geom geometry null,

  -- Optional “helpers” used by UI / label placement
  centroid geometry null,
  bbox geometry null,

  -- Optional cached GeoJSON; seed/jobs can populate; do not require at core.
  geojson jsonb null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent duplicate geometry rows per (entity, geometry_type)
create unique index if not exists entity_geometries_entity_type_uidx
  on public.entity_geometries (entity_id, geometry_type);

-- Fast lookup patterns
create index if not exists entity_geometries_entity_geomtype_idx
  on public.entity_geometries (entity_id, geometry_type);

create index if not exists entity_geometries_entity_idx
  on public.entity_geometries (entity_id);

create index if not exists entity_geometries_type_idx
  on public.entity_geometries (geometry_type);

-- Spatial index (general). Partial gist indexes can be added/kept by later migrations if desired.
create index if not exists entity_geometries_geom_gist_idx
  on public.entity_geometries using gist (geom);

-- updated_at trigger
drop trigger if exists trg_entity_geometries_updated_at on public.entity_geometries;
create trigger trg_entity_geometries_updated_at
before update on public.entity_geometries
for each row execute function public.set_updated_at();

commit;
