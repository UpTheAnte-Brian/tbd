-- -----------------------------------------------------------------------------
-- Provide stable RPC used by seed/import scripts:
-- public.upsert_entity_geometry_from_geojson(...)
-- -----------------------------------------------------------------------------

begin;

-- Ensure required extensions exist (PostGIS + gen_random_uuid)
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- Helper: coerce GeoJSON -> geometry in SRID 4326
-- NOTE: st_geomfromgeojson returns geometry w/ unknown SRID unless set.
create or replace function public._geom_from_geojson_4326(p_geojson jsonb)
returns geometry
language sql
immutable
as $$
  select st_setsrid(st_geomfromgeojson(p_geojson::text), 4326)
$$;

-- Main RPC (signature must match the TS script call)
create or replace function public.upsert_entity_geometry_from_geojson(
  p_entity_id uuid,
  p_geojson jsonb,
  p_geometry_type text,
  p_source text default null
)
returns void
language plpgsql
as $$
declare
  v_geom geometry;
begin
  if p_entity_id is null then
    raise exception 'p_entity_id is required';
  end if;
  if p_geojson is null then
    raise exception 'p_geojson is required';
  end if;
  if p_geometry_type is null or length(trim(p_geometry_type)) = 0 then
    raise exception 'p_geometry_type is required';
  end if;

  v_geom := public._geom_from_geojson_4326(p_geojson);

  -- Upsert primary geometry
  insert into public.entity_geometries (
    entity_id,
    geometry_type,
    source,
    geom,
    geojson,
    updated_at
  )
  values (
    p_entity_id,
    p_geometry_type,
    p_source,
    v_geom,
    p_geojson,
    now()
  )
  on conflict (entity_id, geometry_type)
  do update set
    source    = excluded.source,
    geom      = excluded.geom,
    geojson   = excluded.geojson,
    updated_at = now();

end;
$$;

-- Permissions (adjust if you want service_role-only)
revoke all on function public.upsert_entity_geometry_from_geojson(uuid, jsonb, text, text) from public;
grant execute on function public.upsert_entity_geometry_from_geojson(uuid, jsonb, text, text) to anon, authenticated, service_role;

commit;
