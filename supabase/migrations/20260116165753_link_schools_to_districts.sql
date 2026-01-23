create or replace function public.link_schools_to_districts(p_limit int, p_offset int)
returns jsonb
language plpgsql
as $$
declare
  v_rows_primary int := 0;
  v_rows_state int := 0;
begin
  -- Batch of schools with point geometry
  with school_batch as (
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
  district_candidates as (
    select
      sb.school_id,
      d.id as district_id,
      dg.geom as district_geom
    from school_batch sb
    join public.entities d
      on d.entity_type = 'district'
    join public.entity_geometries dg
      on dg.entity_id = d.id
     and dg.geometry_type = 'boundary'
    where st_covers(dg.geom, sb.school_geom)
  ),
  best_district as (
    select distinct on (school_id)
      school_id,
      district_id
    from district_candidates
    order by
      school_id,
      st_area(district_geom::geography) asc
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
  )
  select count(*) into v_rows_primary from upsert_primary;

  -- Also store MN state containment as a non-primary relationship (optional, but matches your sample output)
  with school_batch as (
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
  mn_state as (
    select s.id as state_id, sg.geom as state_geom
    from public.entities s
    join public.entity_geometries sg
      on sg.entity_id = s.id
     and sg.geometry_type = 'boundary'
    where s.entity_type = 'state'
      and s.slug = 'mn'
    limit 1
  ),
  matches as (
    select
      ms.state_id,
      sb.school_id
    from mn_state ms
    join school_batch sb
      on st_covers(ms.state_geom, sb.school_geom)
  ),
  inserted as (
    insert into public.entity_relationships (
      parent_entity_id,
      child_entity_id,
      relationship_type,
      is_primary
    )
    select
      m.state_id,
      m.school_id,
      'contains',
      false
    from matches m
    on conflict (parent_entity_id, child_entity_id, relationship_type)
    do nothing
    returning 1
  )
  select count(*) into v_rows_state from inserted;

  return jsonb_build_object(
    'limit', p_limit,
    'offset', p_offset,
    'primary_upserts', v_rows_primary,
    'mn_state_inserts', v_rows_state
  );
end;
$$;
