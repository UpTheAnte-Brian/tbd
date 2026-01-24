-- -----------------------------------------------------------------------------
-- Add map children RPC and supporting indexes
-- -----------------------------------------------------------------------------

begin;

create index if not exists entity_relationships_parent_rel_child_idx
  on public.entity_relationships (parent_entity_id, relationship_type, child_entity_id);

create index if not exists entities_type_id_idx
  on public.entities (entity_type, id);

create index if not exists entity_geometries_entity_geomtype_idx
  on public.entity_geometries (entity_id, geometry_type);

create function public.map_children_geojson(
  p_parent_entity_id uuid,
  p_relationship_type text default 'contains',
  p_entity_type text default null,
  p_geometry_type text default 'boundary',
  p_limit integer default 400,
  p_offset integer default 0
)
returns table (
  entity_id uuid,
  entity_type text,
  name text,
  slug text,
  active boolean,
  geojson jsonb
)
language sql
stable
as $$
  select
    e.id as entity_id,
    e.entity_type,
    e.name,
    e.slug,
    e.active,
    eg.geojson as geojson
  from public.entity_relationships r
  join public.entities e
    on e.id = r.child_entity_id
  join public.entity_geometries eg
    on eg.entity_id = e.id
   and eg.geometry_type = p_geometry_type
  where r.parent_entity_id = p_parent_entity_id
    and r.relationship_type = p_relationship_type
    and (p_entity_type is null or e.entity_type = p_entity_type)
  order by e.id
  offset greatest(coalesce(p_offset, 0), 0)
  limit greatest(0, least(coalesce(p_limit, 400), 5000));
$$;

commit;
