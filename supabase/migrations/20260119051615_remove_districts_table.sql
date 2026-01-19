create table public.entity_status (
  entity_id uuid primary key references public.entities(id) on delete cascade,
  status text not null,
  updated_at timestamptz not null default now(),
  constraint entity_status_valid
    check (status in ('unregistered','pending','signed'))
);

-- =========================================================
-- Shared entity attributes + raw source payload tables
-- =========================================================

-- 1) Curated, app-facing attributes (shared across entity types)
create table if not exists public.entity_attributes (
  entity_id uuid not null references public.entities(id) on delete cascade,
  namespace text not null,                      -- e.g. 'mde', 'arcgis', 'aun'
  attrs jsonb not null default '{}'::jsonb,     -- curated attributes
  updated_at timestamptz not null default now(),
  primary key (entity_id, namespace)
);

-- Keep updated_at fresh
drop trigger if exists trg_entity_attributes_updated_at on public.entity_attributes;
create trigger trg_entity_attributes_updated_at
before update on public.entity_attributes
for each row execute function public.set_updated_at();

-- Fast JSON lookup
create index if not exists entity_attributes_attrs_gin
  on public.entity_attributes using gin (attrs);


-- 2) Raw source records (full payload per entity per source)
create table if not exists public.entity_source_records (
  entity_id uuid not null references public.entities(id) on delete cascade,
  source text not null,                         -- e.g. 'mn_mde_struc_school_program_locs_SY2025_26'
  external_key text null,                       -- orgid / OBJECTID / formid etc (optional)
  payload jsonb not null,                       -- full raw attributes from the source
  fetched_at timestamptz not null default now(),
  primary key (entity_id, source)
);

-- Indexes for common access patterns
create index if not exists entity_source_records_source_idx
  on public.entity_source_records (source);

create index if not exists entity_source_records_external_key_idx
  on public.entity_source_records (external_key);

create index if not exists entity_source_records_payload_gin
  on public.entity_source_records using gin (payload);