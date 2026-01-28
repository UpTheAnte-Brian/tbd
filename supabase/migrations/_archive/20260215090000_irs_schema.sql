create schema if not exists irs;

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'irs_return_type'
      and typnamespace = 'irs'::regnamespace
  ) then
    create type irs.irs_return_type as enum ('990', '990EZ', '990PF', '990N', 'unknown');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'irs_doc_type'
      and typnamespace = 'irs'::regnamespace
  ) then
    create type irs.irs_doc_type as enum ('pdf', 'xml', 'other');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'irs_person_role'
      and typnamespace = 'irs'::regnamespace
  ) then
    create type irs.irs_person_role as enum (
      'officer',
      'director',
      'trustee',
      'key_employee',
      'highest_compensated',
      'independent_contractor',
      'other'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'irs_narrative_section'
      and typnamespace = 'irs'::regnamespace
  ) then
    create type irs.irs_narrative_section as enum (
      'part_iii',
      'schedule_o',
      'schedule_d',
      'schedule_a',
      'other'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'irs_restriction_type'
      and typnamespace = 'irs'::regnamespace
  ) then
    create type irs.irs_restriction_type as enum (
      'endowment',
      'donor_restricted',
      'temporarily_restricted',
      'permanently_restricted',
      'board_designated',
      'scholarship_restriction',
      'program_restriction',
      'geographic_restriction',
      'other'
    );
  end if;
end $$;

create table if not exists irs.organizations (
  ein text primary key check (ein ~ '^[0-9]{2}-?[0-9]{7}$'),
  ein_normalized text generated always as (regexp_replace(ein, '-', '', 'g')) stored,
  legal_name text not null,
  normalized_legal_name text,
  aka_names text[] not null default '{}'::text[],
  city text,
  state text,
  country text not null default 'US',
  website text,

  subsection_code text,
  foundation_code text,
  ruling_year int,
  deductibility_code text,

  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_state_city_idx on irs.organizations (state, city);
create index if not exists organizations_legal_name_trgm
  on irs.organizations using gin (legal_name gin_trgm_ops);

create index if not exists organizations_ein_normalized_idx on irs.organizations (ein_normalized);

drop trigger if exists trg_irs_organizations_updated_at on irs.organizations;
create trigger trg_irs_organizations_updated_at
before update on irs.organizations
for each row execute function public.set_updated_at();

-- drop trigger if exists trg_irs_organizations_last_seen_at on irs.organizations;
-- create trigger trg_irs_organizations_last_seen_at
-- before insert on irs.organizations
-- for each row execute procedure
--   (select 'BEGIN NEW.last_seen_at := now(); RETURN NEW; END;'::regprocedure);

create table if not exists irs.returns (
  id uuid primary key default gen_random_uuid(),
  ein text not null references irs.organizations(ein) on delete cascade,

  return_type irs.irs_return_type not null default 'unknown',
  tax_year int not null check (tax_year between 1900 and 2100),
  tax_period_start date,
  tax_period_end date,

  filed_on date,
  irs_object_id text,
  source_system text not null default 'irs',

  is_amended boolean,
  is_terminated boolean,

  principal_officer_name text,
  gross_receipts_cap numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint returns_unique unique (ein, return_type, tax_year),
  constraint returns_tax_period_chk check (
    tax_period_start is null or tax_period_end is null or tax_period_end >= tax_period_start
  )
);

create index if not exists returns_ein_year_idx on irs.returns (ein, tax_year desc);

create index if not exists returns_ein_type_year_idx on irs.returns (ein, return_type, tax_year desc);
create index if not exists returns_object_id_idx on irs.returns (irs_object_id);

drop trigger if exists trg_irs_returns_updated_at on irs.returns;
create trigger trg_irs_returns_updated_at
before update on irs.returns
for each row execute function public.set_updated_at();

create table if not exists irs.return_documents (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references irs.returns(id) on delete cascade,

  doc_type irs.irs_doc_type not null,
  storage_bucket text,
  storage_path text,
  sha256 text,
  mime_type text,
  bytes int,

  fetched_from text,
  fetched_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists return_documents_return_id_idx on irs.return_documents (return_id);

create unique index if not exists return_documents_unique_path_uidx
  on irs.return_documents (return_id, doc_type, storage_path)
  where storage_path is not null;

create table if not exists irs.return_financials (
  return_id uuid primary key references irs.returns(id) on delete cascade,

  total_revenue numeric,
  total_expenses numeric,
  excess_or_deficit numeric,

  total_assets_begin numeric,
  total_assets_end numeric,
  total_liabilities_begin numeric,
  total_liabilities_end numeric,
  net_assets_begin numeric,
  net_assets_end numeric,

  constraint return_financials_net_assets_chk check (
    net_assets_end is null or total_assets_end is null or total_liabilities_end is null
    or net_assets_end = (total_assets_end - total_liabilities_end)
  ),

  contributions numeric,
  program_service_revenue numeric,
  investment_income numeric,
  fundraising_gross numeric,

  program_expenses numeric,
  management_general_expenses numeric,
  fundraising_expenses numeric,

  source_map jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists return_financials_net_assets_end_idx
  on irs.return_financials (net_assets_end desc);

drop trigger if exists trg_irs_return_financials_updated_at on irs.return_financials;
create trigger trg_irs_return_financials_updated_at
before update on irs.return_financials
for each row execute function public.set_updated_at();

create table if not exists irs.return_people (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references irs.returns(id) on delete cascade,

  role irs.irs_person_role not null,
  name text not null,
  title text,
  average_hours_per_week numeric,
  reportable_compensation numeric,
  other_compensation numeric,

  is_current boolean default true,

  source_map jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists return_people_return_idx on irs.return_people (return_id);
create index if not exists return_people_name_trgm
  on irs.return_people using gin (name gin_trgm_ops);
create unique index if not exists return_people_unique_uidx
  on irs.return_people (return_id, role, name, coalesce(title, ''));

create table if not exists irs.return_narratives (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references irs.returns(id) on delete cascade,

  section irs.irs_narrative_section not null,
  label text,
  raw_text text not null,

  extracted jsonb not null default '{}'::jsonb,
  ai_summary text,

  source_map jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists return_narratives_return_idx on irs.return_narratives (return_id);
create index if not exists return_narratives_section_idx on irs.return_narratives (section);

create table if not exists irs.return_restrictions (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references irs.returns(id) on delete cascade,

  restriction_type irs.irs_restriction_type not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb,

  confidence numeric,
  source_narrative_id uuid references irs.return_narratives(id) on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists return_restrictions_return_idx on irs.return_restrictions (return_id);
create index if not exists return_restrictions_type_idx
  on irs.return_restrictions (restriction_type);

create table if not exists irs.entity_links (
  ein text primary key references irs.organizations(ein) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,

  match_type text not null default 'manual',
  confidence numeric,
  notes text,

  created_at timestamptz not null default now()
);

create index if not exists irs_entity_links_entity_id_idx on irs.entity_links (entity_id);


-- -------------------------------------------------------------------
-- Convenience views
-- -------------------------------------------------------------------
create or replace view irs.latest_returns as
select distinct on (r.ein, r.return_type)
  r.*
from irs.returns r
order by r.ein, r.return_type, r.tax_year desc;

create or replace view irs.latest_financials as
select
  lr.ein,
  lr.return_type,
  lr.tax_year,
  f.*
from irs.latest_returns lr
join irs.return_financials f on f.return_id = lr.id;

-- -------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------
alter table irs.organizations enable row level security;
alter table irs.returns enable row level security;
alter table irs.return_documents enable row level security;
alter table irs.return_financials enable row level security;
alter table irs.return_people enable row level security;
alter table irs.return_narratives enable row level security;
alter table irs.return_restrictions enable row level security;
alter table irs.entity_links enable row level security;

-- Helper: does the current user administer a given EIN via entity link?
create or replace function irs.can_access_ein(p_ein text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from irs.entity_links l
    where l.ein = p_ein
      and public.is_entity_admin(l.entity_id)
  );
$$;

revoke all on all tables in schema irs from anon, authenticated;
revoke all on all functions in schema irs from anon, authenticated;

-- Read access for authenticated users *only when* EIN is linked to an entity they admin.
create policy irs_orgs_read
  on irs.organizations
  for select
  to authenticated
  using (irs.can_access_ein(ein));

create policy irs_returns_read
  on irs.returns
  for select
  to authenticated
  using (irs.can_access_ein(ein));

create policy irs_financials_read
  on irs.return_financials
  for select
  to authenticated
  using (irs.can_access_ein((select r.ein from irs.returns r where r.id = return_id)));

create policy irs_people_read
  on irs.return_people
  for select
  to authenticated
  using (irs.can_access_ein((select r.ein from irs.returns r where r.id = return_id)));

create policy irs_narratives_read
  on irs.return_narratives
  for select
  to authenticated
  using (irs.can_access_ein((select r.ein from irs.returns r where r.id = return_id)));

create policy irs_restrictions_read
  on irs.return_restrictions
  for select
  to authenticated
  using (irs.can_access_ein((select r.ein from irs.returns r where r.id = return_id)));

create policy irs_links_read
  on irs.entity_links
  for select
  to authenticated
  using (public.is_entity_admin(entity_id));

-- Service role (ingestion) full access
grant usage on schema irs to service_role;
grant all on all tables in schema irs to service_role;
grant all on all functions in schema irs to service_role;