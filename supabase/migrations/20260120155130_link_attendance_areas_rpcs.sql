create or replace function public.link_attendance_areas_to_districts(p_limit int, p_offset int)
returns jsonb
language plpgsql
as $$
declare
  v_rows int := 0;
begin
  with aa_batch as (
    select
      aa.entity_id as attendance_area_id,
      aam.sdorgid as sdorgid
    from public.attendance_area_metadata aam
    join public.entities aa
      on aa.id = aam.entity_id
     and aa.entity_type = 'attendance_area'
    order by aa.entity_id
    limit p_limit
    offset p_offset
  ),
  matches as (
    select
      d.id as district_id,
      b.attendance_area_id
    from aa_batch b
    join public.entities d
      on d.entity_type = 'district'
     and (d.external_ids->>'sdorgid') = b.sdorgid
    where b.sdorgid is not null and b.sdorgid <> ''
  ),
  upserted as (
    insert into public.entity_relationships (
      parent_entity_id,
      child_entity_id,
      relationship_type,
      is_primary
    )
    select
      m.district_id,
      m.attendance_area_id,
      'contains',
      true
    from matches m
    on conflict (child_entity_id, relationship_type) where is_primary
    do update
      set parent_entity_id = excluded.parent_entity_id,
          is_primary = true
    returning 1
  )
  select count(*) into v_rows from upserted;

  return jsonb_build_object(
    'limit', p_limit,
    'offset', p_offset,
    'attendance_areas_linked_to_districts', v_rows
  );
end;
$$;

create or replace function public.link_attendance_areas_to_schools(p_limit int, p_offset int)
returns jsonb
language plpgsql
as $$
declare
  v_elem int := 0;
  v_midd int := 0;
  v_high int := 0;
begin
  with aa_batch as (
    select
      aa.id as attendance_area_id,
      aam.elem_orgid,
      aam.midd_orgid,
      aam.high_orgid
    from public.entities aa
    join public.attendance_area_metadata aam
      on aam.entity_id = aa.id
    where aa.entity_type = 'attendance_area'
    order by aa.id
    limit p_limit
    offset p_offset
  ),
  schools as (
    select
      s.id as school_id,
      (s.external_ids->>'mde_orgid') as mde_orgid
    from public.entities s
    where s.entity_type = 'school'
      and s.external_ids ? 'mde_orgid'
  ),

  elem_matches as (
    select b.attendance_area_id, sc.school_id
    from aa_batch b
    join schools sc on sc.mde_orgid = b.elem_orgid
    where b.elem_orgid is not null and b.elem_orgid <> ''
  ),
  midd_matches as (
    select b.attendance_area_id, sc.school_id
    from aa_batch b
    join schools sc on sc.mde_orgid = b.midd_orgid
    where b.midd_orgid is not null and b.midd_orgid <> ''
  ),
  high_matches as (
    select b.attendance_area_id, sc.school_id
    from aa_batch b
    join schools sc on sc.mde_orgid = b.high_orgid
    where b.high_orgid is not null and b.high_orgid <> ''
  ),

  ins_elem as (
    insert into public.entity_relationships (parent_entity_id, child_entity_id, relationship_type, is_primary)
    select attendance_area_id, school_id, 'serves_elementary', false
    from elem_matches
    on conflict (parent_entity_id, child_entity_id, relationship_type) do nothing
    returning 1
  ),
  ins_midd as (
    insert into public.entity_relationships (parent_entity_id, child_entity_id, relationship_type, is_primary)
    select attendance_area_id, school_id, 'serves_middle', false
    from midd_matches
    on conflict (parent_entity_id, child_entity_id, relationship_type) do nothing
    returning 1
  ),
  ins_high as (
    insert into public.entity_relationships (parent_entity_id, child_entity_id, relationship_type, is_primary)
    select attendance_area_id, school_id, 'serves_high', false
    from high_matches
    on conflict (parent_entity_id, child_entity_id, relationship_type) do nothing
    returning 1
  )
  select
    (select count(*) from ins_elem),
    (select count(*) from ins_midd),
    (select count(*) from ins_high)
  into v_elem, v_midd, v_high;

  return jsonb_build_object(
    'limit', p_limit,
    'offset', p_offset,
    'elem_links', v_elem,
    'midd_links', v_midd,
    'high_links', v_high
  );
end;
$$;
