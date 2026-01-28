-- Ensure geometry_type constraint and canonical geometry upsert RPC are aligned.

alter table public.entity_geometries
  drop constraint if exists entity_geometries_geom_type_check;

alter table public.entity_geometries
  add constraint entity_geometries_geom_type_check
  check (
    geometry_type = any (
      array[
        'boundary',
        'boundary_simplified',
        'point',
        'service_area',
        'district_attendance_areas',
        'school_program_locations'
      ]::text[]
    )
  );

drop function if exists public.upsert_entity_geometry_from_geojson(uuid,jsonb,text,text,boolean,text,double precision);
drop function if exists public.upsert_entity_geometry_from_geojson(uuid,jsonb,text,boolean,text,double precision);

create or replace function public.upsert_entity_geometry_from_geojson(
  p_entity_id uuid,
  p_geojson jsonb,
  p_geometry_type text,
  p_simplified_type text default null,
  p_simplify boolean default false,
  p_source text default null,
  p_tolerance double precision default 0.0001
) returns void
language plpgsql
as $$
declare
  v_geom geometry;
  v_bbox geometry;
  v_centroid geometry;

  v_simplified geometry;
  v_s_bbox geometry;
  v_s_centroid geometry;
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

  -- Convert GeoJSON -> PostGIS geometry (SRID 4326)
  v_geom := public._geom_from_geojson_4326(p_geojson);

  -- Derivatives
  v_bbox := st_envelope(v_geom);
  v_centroid := st_pointonsurface(v_geom);

  -- Upsert primary geometry row (canonical)
  insert into public.entity_geometries (
    entity_id,
    geometry_type,
    source,
    geom,
    geojson,
    bbox,
    centroid,
    created_at,
    updated_at
  )
  values (
    p_entity_id,
    p_geometry_type,
    p_source,
    v_geom,
    p_geojson,
    v_bbox,
    v_centroid,
    now(),
    now()
  )
  on conflict (entity_id, geometry_type)
  do update set
    source     = excluded.source,
    geom       = excluded.geom,
    geojson    = excluded.geojson,
    bbox       = excluded.bbox,
    centroid   = excluded.centroid,
    updated_at = now();

  -- Optional simplified geometry record
  if coalesce(p_simplify, false) is true then
    if p_simplified_type is null or length(trim(p_simplified_type)) = 0 then
      raise exception 'p_simplified_type is required when p_simplify = true';
    end if;

    begin
      v_simplified := st_simplifypreservetopology(v_geom, p_tolerance);
    exception when others then
      v_simplified := st_simplify(v_geom, p_tolerance);
    end;

    v_s_bbox := st_envelope(v_simplified);
    v_s_centroid := st_pointonsurface(v_simplified);

    insert into public.entity_geometries (
      entity_id,
      geometry_type,
      source,
      geom,
      geojson,
      bbox,
      centroid,
      created_at,
      updated_at
    )
    values (
      p_entity_id,
      p_simplified_type,
      p_source,
      v_simplified,
      st_asgeojson(v_simplified, 9, 8)::jsonb,
      v_s_bbox,
      v_s_centroid,
      now(),
      now()
    )
    on conflict (entity_id, geometry_type)
    do update set
      source     = excluded.source,
      geom       = excluded.geom,
      geojson    = excluded.geojson,
      bbox       = excluded.bbox,
      centroid   = excluded.centroid,
      updated_at = now();
  end if;
end;
$$;
