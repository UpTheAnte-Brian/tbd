-- Expose app-friendly GeoJSON via PostgREST.
-- The base table is public.entity_geometries (geom + geojson).
-- This view exists so the app can query /rest/v1/entity_geometries_geojson

begin;

create or replace view public.entity_geometries_geojson
with (security_invoker = true) as
select
  eg.entity_id,
  eg.geometry_type,
  eg.geojson,
  eg.source,
  eg.created_at,
  eg.updated_at
from public.entity_geometries eg;

comment on view public.entity_geometries_geojson is
  'Convenience view for PostgREST: exposes stored GeoJSON FeatureCollections per entity + geometry_type.';

grant select on public.entity_geometries_geojson to anon, authenticated;

commit;
