-- Fast verification checks for TEST environment

-- Entity counts by type
select entity_type, count(*) as entity_count
from public.entities
group by entity_type
order by entity_type;

-- Boundary geometry count
select count(*) as boundary_count
from public.entity_geometries
where geometry_type = 'boundary';

-- School program locations geometry count
select count(*) as school_program_locations_count
from public.entity_geometries
where geometry_type = 'school_program_locations';

-- GeoJSON coverage check (expect 0 nulls)
select count(*) as boundary_null_geojson
from public.entity_geometries
where geometry_type = 'boundary'
  and geojson is null;

-- MN -> district relationship count (expect ~329)
with mn as (
  select id
  from public.entities
  where slug = 'mn'
    and entity_type = 'state'
  limit 1
)
select count(*) as mn_district_relationships
from public.entity_relationships r
join public.entities e
  on e.id = r.child_entity_id
where r.parent_entity_id = (select id from mn)
  and r.relationship_type = 'contains'
  and e.entity_type = 'district';

-- MN district boundary geometry count (expect ~329)
with mn as (
  select id
  from public.entities
  where slug = 'mn'
    and entity_type = 'state'
  limit 1
),
child_ids as (
  select r.child_entity_id
  from public.entity_relationships r
  join public.entities e
    on e.id = r.child_entity_id
  where r.parent_entity_id = (select id from mn)
    and r.relationship_type = 'contains'
    and e.entity_type = 'district'
)
select count(*) as mn_district_boundary_geometries
from public.entity_geometries eg
join child_ids c
  on c.child_entity_id = eg.entity_id
where eg.geometry_type = 'boundary';
