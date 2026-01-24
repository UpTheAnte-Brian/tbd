DROP FUNCTION IF EXISTS public.upsert_entity_geometry_from_geojson(
  uuid,
  jsonb,
  text,
  text,
  boolean,
  text,
  double precision
);

create or replace function public.upsert_entity_geometry_from_geojson(
  p_entity_id uuid,
  p_geojson jsonb,
  p_geometry_type text,
  p_simplified_type text default null::text,
  p_simplify boolean default false,
  p_source text default null::text,
  p_tolerance double precision default 0.0001
)
returns void
language plpgsql
as $function$
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

  -- Upsert primary geometry row (NO geom column)
  insert into public.entity_geometries (
    entity_id,
    geometry_type,
    source,
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
    p_geojson,
    v_bbox,
    v_centroid,
    now(),
    now()
  )
  on conflict (entity_id, geometry_type)
  do update set
    source     = excluded.source,
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
      st_asgeojson(v_simplified, 9, 8)::jsonb,
      v_s_bbox,
      v_s_centroid,
      now(),
      now()
    )
    on conflict (entity_id, geometry_type)
    do update set
      source     = excluded.source,
      geojson    = excluded.geojson,
      bbox       = excluded.bbox,
      centroid   = excluded.centroid,
      updated_at = now();
  end if;
end;
$function$;
