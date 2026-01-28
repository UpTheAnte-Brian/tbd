-- Kill the legacy GeoJSON convenience view and have RPCs read the base table directly.
-- This avoids relying on any partially-populated legacy geometry column.

-- 1) Drop the legacy convenience view.
drop view if exists public.entity_geometries_geojson cascade;

-- Drop any other legacy objects that still depend on `entity_geometries.geom`.
-- If we find we still need these later, we can re-create them to use `geojson` instead.
drop view if exists public.v_mn_schools cascade;

-- Drop the existing RPC before re-creating it, because Postgres cannot change
-- input parameter names/order via CREATE OR REPLACE.
drop function if exists public.map_children_geojson(uuid, text, text, text, integer, integer);

-- 3) RPC used by `/api/map/entities/:id/children`
--    Reads directly from `public.entity_geometries.geojson`.
create or replace function public.map_children_geojson(
  p_parent_entity_id uuid,
  p_relationship_type text,
  p_geometry_type text,
  p_entity_type text default null,
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
security definer
set search_path = public
as $$
  select
    e.id as entity_id,
    e.entity_type,
    e.name,
    e.slug,
    null::boolean as active,
    eg.geojson
  from public.entity_relationships er
  join public.entities e
    on e.id = er.child_entity_id
  join public.entity_geometries eg
    on eg.entity_id = er.child_entity_id
  where er.parent_entity_id = p_parent_entity_id
    and er.relationship_type = p_relationship_type
    and (p_entity_type is null or e.entity_type = p_entity_type)
    and eg.geometry_type = p_geometry_type
    and eg.geojson is not null
  order by e.name nulls last, e.id
  limit greatest(0, least(coalesce(p_limit, 400), 5000))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- 2) Remove the confusing legacy column (we keep `geojson` as canonical).
alter table if exists public.entity_geometries
  drop column if exists geom;

-- Permissions
revoke all on function public.map_children_geojson(uuid, text, text, text, integer, integer) from public;
grant execute on function public.map_children_geojson(uuid, text, text, text, integer, integer) to anon, authenticated, service_role;