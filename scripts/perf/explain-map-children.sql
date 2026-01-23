-- Explain map children query paths (fill in the parent entity UUID).

explain (analyze, buffers, verbose)
select
  e.id,
  e.entity_type,
  e.name,
  e.slug,
  e.active,
  eg.geojson
from public.entity_relationships r
join public.entities e on e.id = r.child_entity_id
join public.entity_geometries eg
  on eg.entity_id = e.id
 and eg.geometry_type = 'boundary'
where r.parent_entity_id = 'a44ee5a4-afc9-4710-a53d-0239c3eda1f7'::uuid
  and r.relationship_type = 'contains'
  and e.entity_type = 'district'
order by e.id
limit 400;
