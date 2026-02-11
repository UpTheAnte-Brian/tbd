begin;

-- Address storage (separate from geocoding)
create table if not exists public.entity_addresses (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  label text not null default 'primary',
  address1 text,
  address2 text,
  city text,
  state text,
  postal text,
  country text default 'US',
  source_system text default 'manual',
  source_ref text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entity_addresses_entity_id_idx
  on public.entity_addresses(entity_id);

-- Geocode results (multiple per address)
create table if not exists public.entity_address_geocodes (
  id uuid primary key default gen_random_uuid(),
  entity_address_id uuid not null references public.entity_addresses(id) on delete cascade,
  provider text not null,
  place_id text,
  lat double precision not null,
  lng double precision not null,
  accuracy text,
  confidence int not null default 50,
  geocoded_at timestamptz not null default now(),
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create index if not exists entity_address_geocodes_address_id_idx
  on public.entity_address_geocodes(entity_address_id);

-- Helper view: best geocode per entity (primary address only)
create or replace view public.v_entity_best_geocode as
select
  ea.entity_id,
  eac.provider,
  eac.place_id,
  eac.lat,
  eac.lng,
  eac.accuracy,
  eac.confidence,
  eac.geocoded_at
from public.entity_addresses ea
join lateral (
  select *
  from public.entity_address_geocodes g
  where g.entity_address_id = ea.id
  order by g.confidence desc, g.geocoded_at desc
  limit 1
) eac on true
where ea.is_primary = true;

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_entity_addresses_updated_at on public.entity_addresses;
create trigger trg_entity_addresses_updated_at
before update on public.entity_addresses
for each row execute function public.set_updated_at();

-- Backfill from legacy nonprofits.address (one-time, idempotent)
insert into public.entity_addresses (entity_id, label, address1, source_system, is_primary)
select
  n.entity_id,
  'primary',
  n.address,
  'legacy_nonprofits_table',
  true
from public.nonprofits n
where n.address is not null
  and not exists (
    select 1
    from public.entity_addresses ea
    where ea.entity_id = n.entity_id
      and ea.is_primary = true
  );

-- Allow nonprofit_locations geometry type
alter table if exists public.entity_geometries
  drop constraint if exists entity_geometries_geom_type_check;

alter table if exists public.entity_geometries
  add constraint entity_geometries_geom_type_check
  check (
    geometry_type = any (
      array[
        'boundary'::text,
        'boundary_simplified'::text,
        'point'::text,
        'service_area'::text,
        'district_attendance_areas'::text,
        'school_program_locations'::text,
        'nonprofit_locations'::text
      ]
    )
  );

-- Link nonprofits to districts via superintendent_scope_nonprofits
create or replace function public.link_nonprofits_to_districts(
  p_limit int default 1000,
  p_offset int default 0
) returns json
language plpgsql
as $$
declare
  inserted_count int := 0;
begin
  with candidates as (
    select
      ssn.district_entity_id as parent_entity_id,
      ssn.entity_id as child_entity_id
    from public.superintendent_scope_nonprofits ssn
    where ssn.entity_id is not null
    order by ssn.created_at asc
    limit p_limit
    offset p_offset
  ),
  ins as (
    insert into public.entity_relationships(parent_entity_id, child_entity_id, relationship_type, created_at)
    select c.parent_entity_id, c.child_entity_id, 'contains', now()
    from candidates c
    where not exists (
      select 1 from public.entity_relationships er
      where er.parent_entity_id = c.parent_entity_id
        and er.child_entity_id = c.child_entity_id
        and er.relationship_type = 'contains'
    )
    returning 1
  )
  select count(*) into inserted_count from ins;

  return json_build_object(
    'inserted', inserted_count,
    'limit', p_limit,
    'offset', p_offset
  );
end;
$$;

commit;
