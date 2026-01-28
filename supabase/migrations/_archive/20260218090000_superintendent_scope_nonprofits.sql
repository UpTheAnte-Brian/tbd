create table public.superintendent_scope_nonprofits (
  id uuid not null default gen_random_uuid (),
  district_entity_id uuid not null,
  ein text not null,
  label text null,
  tier text not null default 'registry_only'::text,
  status text not null default 'candidate'::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entity_id uuid null,

  constraint superintendent_scope_nonprofits_pkey
    primary key (id),

  constraint superintendent_scope_nonprofits_district_entity_id_fkey
    foreign key (district_entity_id)
    references public.entities (id)
    on delete cascade,

  constraint superintendent_scope_nonprofits_entity_id_fkey
    foreign key (entity_id)
    references public.entities (id)
    on delete set null,

  constraint superintendent_scope_nonprofits_status_check
    check (status in ('candidate','active','archived')),

  constraint superintendent_scope_nonprofits_tier_check
    check (tier in ('registry_only','disclosure_grade','institutional'))
) tablespace pg_default;

-- Lookup / filter indexes
create index if not exists superintendent_scope_nonprofits_ein_idx
  on public.superintendent_scope_nonprofits (ein);

create index if not exists superintendent_scope_nonprofits_status_idx
  on public.superintendent_scope_nonprofits (status);

create index if not exists idx_scope_nps_district_status
  on public.superintendent_scope_nonprofits (district_entity_id, status);

create index if not exists idx_scope_nps_entity
  on public.superintendent_scope_nonprofits (entity_id);

-- ✅ Correct uniqueness rule:
-- one EIN per district, but same EIN may appear in other districts
create unique index if not exists superintendent_scope_nonprofits_district_ein_uidx
  on public.superintendent_scope_nonprofits (district_entity_id, ein);

-- Updated-at trigger
create trigger trg_superintendent_scope_nonprofits_updated_at
before update on public.superintendent_scope_nonprofits
for each row execute function public.set_updated_at();