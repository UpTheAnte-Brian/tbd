-- Geometry RPC compatibility layer.
-- Purpose:
--  - Our TS import scripts call `upsert_entity_geometry_with_geom_geojson(...)`
--  - Some DB environments only have `upsert_entity_geometry_from_geojson(...)`
--  - This migration provides a stable RPC that directly upserts into public.entity_geometries
--    using PostGIS conversions from GeoJSON geometry objects.

begin;

-- Ensure postgis exists (needed for ST_GeomFromGeoJSON)
create extension if not exists postgis;

-- Ensure a unique constraint exists for upsert target
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'entity_geometries_entity_geomtype_uidx'
  ) then
    create unique index entity_geometries_entity_geomtype_uidx
      on public.entity_geometries (entity_id, geometry_type);
  end if;
end $$;

-- Compatibility RPC expected by scripts:
-- p_geojson: FeatureCollection or JSON used by the app (stored as-is)
-- p_geom_geojson: GeoJSON Geometry object ONLY (Point/Polygon/MultiPolygon/etc)
-- p_bbox: optional json like {minX,minY,maxX,maxY} (we store it if column exists; otherwise ignore)
create or replace function public.upsert_entity_geometry_with_geom_geojson(
  p_entity_id uuid,
  p_geometry_type text,
  p_geojson jsonb,
  p_geom_geojson jsonb,
  p_bbox jsonb,
  p_source text,
  p_simplified_type text default null,
  p_simplify boolean default false,
  p_tolerance double precision default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_geom geometry;
  v_bbox geometry;
begin
  if p_entity_id is null then
    raise exception 'p_entity_id is required';
  end if;

  if p_geometry_type is null or length(trim(p_geometry_type)) = 0 then
    raise exception 'p_geometry_type is required';
  end if;

  if p_geom_geojson is null then
    raise exception 'p_geom_geojson is required (GeoJSON Geometry object)';
  end if;

  -- Convert GeoJSON Geometry -> PostGIS geometry
  v_geom := ST_SetSRID(ST_GeomFromGeoJSON(p_geom_geojson::text), 4326);

  if v_geom is null then
    raise exception 'Invalid GeoJSON geometry (p_geom_geojson).';
  end if;

  -- Optional simplification path
  if coalesce(p_simplify, false) = true and p_tolerance is not null then
    -- Preserve topology when possible
    v_geom := ST_SimplifyPreserveTopology(v_geom, p_tolerance);
  end if;

  -- Compute bbox geometry (envelope)
  v_bbox := ST_Envelope(v_geom);

  -- Upsert into entity_geometries
  insert into public.entity_geometries (
    entity_id,
    geometry_type,
    geom,
    geojson,
    source,
    bbox,
    updated_at
  )
  values (
    p_entity_id,
    p_geometry_type,
    v_geom,
    p_geojson,
    p_source,
    v_bbox,
    now()
  )
  on conflict (entity_id, geometry_type)
  do update set
    geom = excluded.geom,
    geojson = excluded.geojson,
    source = excluded.source,
    bbox = excluded.bbox,
    updated_at = now();

  -- If caller provided a simplified_type, also upsert that row using the same geometry.
  if p_simplified_type is not null and length(trim(p_simplified_type)) > 0 then
    insert into public.entity_geometries (
      entity_id,
      geometry_type,
      geom,
      geojson,
      source,
      bbox,
      updated_at
    )
    values (
      p_entity_id,
      p_simplified_type,
      v_geom,
      p_geojson,
      p_source,
      v_bbox,
      now()
    )
    on conflict (entity_id, geometry_type)
    do update set
      geom = excluded.geom,
      geojson = excluded.geojson,
      source = excluded.source,
      bbox = excluded.bbox,
      updated_at = now();
  end if;

end;
$$;

commit;
