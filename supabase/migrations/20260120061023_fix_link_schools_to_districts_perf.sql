create or replace function public.link_schools_to_districts(p_limit int, p_offset int)
returns jsonb
language plpgsql
as $$
declare
  v_rows_primary int := 0;
  v_rows_state int := 0;
begin
  -- Give this job room to run (only affects this call)
  perform set_config('statement_timeout', '10min', true);

  with
  school_batch as materialized (
    select
      e.id as school_id,
      eg.geom as school_geom
    from public.entities e
    join public.entity_geometries eg
      on eg.entity_id = e.id
     and eg.geometry_type = 'school_program_locations'
    where e.entity_type = 'school'
    order by e.id
    limit p_limit
    offset p_offset
  ),

  -- Pick ONE geometry per district (prefer boundary_simplified over boundary)
  district_geoms as materialized (
    select distinct on (d.id)
      d.id as district_id,
      dg.geom as district_geom,
      dg.geometry_type as district_geom_type,
      st_area(dg.geom::geography) as district_area_geog
    from public.entities d
    join public.entity_geometries dg
      on dg.entity_id = d.id
     and dg.geometry_type in ('boundary_simplified','boundary')
    where d.entity_type = 'district'
    order by
      d.id,
      (dg.geometry_type = 'boundary_simplified') desc
  ),

  district_candidates as (
    select
      sb.school_id,
      dg.district_id,
      dg.district_geom_type,
      dg.district_area_geog
    from school_batch sb
    join district_geoms dg
      on (dg.district_geom && sb.school_geom) -- fast bbox prefilter
     and st_covers(dg.district_geom, sb.school_geom) -- exact test
  ),

  best_district as (
    select distinct on (school_id)
      school_id,
      district_id
    from district_candidates
    order by
      school_id,
      (district_geom_type = 'boundary_simplified') desc,
      district_area_geog asc
  ),

  upsert_primary as (
    insert into public.entity_relationships (
      parent_entity_id,
      child_entity_id,
      relationship_type,
      is_primary
    )
    select
      bd.district_id,
      bd.school_id,
      'contains',
      true
    from best_district bd
    on conflict (child_entity_id, relationship_type) where is_primary
    do update
      set parent_entity_id = excluded.parent_entity_id,
          is_primary = true
    returning 1
  ),

  mn_state as materialized (
    select s.id as state_id, sg.geom as state_geom
    from public.entities s
    join public.entity_geometries sg
      on sg.entity_id = s.id
     and sg.geometry_type in ('boundary_simplified','boundary')
    where s.entity_type = 'state'
      and s.slug = 'mn'
    order by (sg.geometry_type = 'boundary_simplified') desc
    limit 1
  ),

  inserted_state as (
    insert into public.entity_relationships (
      parent_entity_id,
      child_entity_id,
      relationship_type,
      is_primary
    )
    select
      ms.state_id,
      sb.school_id,
      'contains',
      false
    from mn_state ms
    join school_batch sb
      on (ms.state_geom && sb.school_geom) -- bbox prefilter
     and st_covers(ms.state_geom, sb.school_geom)
    on conflict (parent_entity_id, child_entity_id, relationship_type)
    do nothing
    returning 1
  )

  select
    (select count(*) from upsert_primary),
    (select count(*) from inserted_state)
  into v_rows_primary, v_rows_state;

  return jsonb_build_object(
    'limit', p_limit,
    'offset', p_offset,
    'primary_upserts', v_rows_primary,
    'mn_state_inserts', v_rows_state
  );
end;
$$;

create index if not exists idx_entity_geometries_school_prog_loc_gist
on public.entity_geometries using gist (geom)
where geometry_type = 'school_program_locations';

create index if not exists idx_entity_geometries_district_bdry_simp_gist
on public.entity_geometries using gist (geom)
where geometry_type = 'boundary_simplified';

create index if not exists idx_entity_geometries_district_bdry_gist
on public.entity_geometries using gist (geom)
where geometry_type = 'boundary';

create index if not exists idx_entity_geometries_entity_type
on public.entity_geometries (entity_id, geometry_type);