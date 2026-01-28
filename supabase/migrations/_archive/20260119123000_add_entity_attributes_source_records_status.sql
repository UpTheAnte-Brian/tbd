-- Shared entity attribute/payload tables + district onboarding status
-- Safe to run multiple times.

-- 1) entity_attributes: curated attributes (per entity, per namespace)
create table if not exists public.entity_attributes (
  entity_id uuid not null references public.entities(id) on delete cascade,
  namespace text not null,                      -- e.g. 'mde', 'arcgis', 'aun'
  attrs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (entity_id, namespace)
);

-- updated_at trigger (requires public.set_updated_at() to exist)
drop trigger if exists trg_entity_attributes_updated_at on public.entity_attributes;
create trigger trg_entity_attributes_updated_at
before update on public.entity_attributes
for each row execute function public.set_updated_at();

create index if not exists entity_attributes_attrs_gin
  on public.entity_attributes using gin (attrs);

-- 2) entity_source_records: raw payload per entity per source
create table if not exists public.entity_source_records (
  entity_id uuid not null references public.entities(id) on delete cascade,
  source text not null,                         -- e.g. 'mn_mde_struc_school_program_locs_SY2025_26'
  external_key text null,                       -- orgid / OBJECTID / formid etc
  payload jsonb not null,                       -- full raw source attributes
  fetched_at timestamptz not null default now(),
  primary key (entity_id, source)
);

create index if not exists entity_source_records_source_idx
  on public.entity_source_records (source);

create index if not exists entity_source_records_external_key_idx
  on public.entity_source_records (external_key);

create index if not exists entity_source_records_payload_gin
  on public.entity_source_records using gin (payload);

-- 3) entity_status: preserve legacy district onboarding state at the entity level
create table if not exists public.entity_status (
  entity_id uuid primary key references public.entities(id) on delete cascade,
  status text not null,
  updated_at timestamptz not null default now(),
  constraint entity_status_valid check (status in ('unregistered','pending','signed'))
);

drop trigger if exists trg_entity_status_updated_at on public.entity_status;
create trigger trg_entity_status_updated_at
before update on public.entity_status
for each row execute function public.set_updated_at();
