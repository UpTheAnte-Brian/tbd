create or replace view public.v_mn_schools as
select
  s.id as school_id,
  mn.id as mn_state_id
from public.entities s
join public.entity_geometries sg
  on sg.entity_id = s.id
 and sg.geometry_type = 'school_program_locations'
join public.entities mn
  on mn.entity_type = 'state'
 and mn.slug = 'mn'
join public.entity_geometries mng
  on mng.entity_id = mn.id
 and mng.geometry_type = 'boundary'
where st_covers(mng.geom, sg.geom);
