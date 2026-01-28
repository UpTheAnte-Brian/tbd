-- 1) add geom if missing
alter table public.entity_geometries
  add column if not exists geom geometry;

-- NOTE: Some legacy rows may contain invalid GeoJSON. We avoid failing the migration
-- by using a safe wrapper that returns NULL on parse errors.
create or replace function public.safe_geom_from_geojson_4326(p_geojson jsonb)
returns geometry
language plpgsql
stable
as $$
begin
  begin
    return public._geom_from_geojson_4326(p_geojson);
  exception when others then
    return null;
  end;
end;
$$;

with candidates as (
  select
    eg.id,
    public.safe_geom_from_geojson_4326(eg.geojson) as parsed_geom
  from public.entity_geometries eg
  where eg.geom is null
    and eg.geojson is not null
)
update public.entity_geometries eg
set geom = c.parsed_geom
from candidates c
where eg.id = c.id
  and c.parsed_geom is not null;

-- Optional: quick sanity checks you can run after deploy
-- select count(*) as still_null_geom from public.entity_geometries where geom is null and geojson is not null;
-- select id, entity_id, geometry_type from public.entity_geometries where geom is null and geojson is not null limit 25;

-- 3) index for spatial queries
create index if not exists entity_geometries_geom_gix
  on public.entity_geometries
  using gist (geom);