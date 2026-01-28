-- Ensure resets are deterministic: Postgres cannot rename function arg names via CREATE OR REPLACE.
-- So we drop the function(s) and recreate in the canonical migration that follows.

do $$
begin
  -- Drop any variants that might exist from older migrations.
  -- If you have multiple signatures over time, add them here.

  -- Known signature (adjust if your history differs):
  execute 'drop function if exists public.map_children_geojson(uuid, text, text, text, integer, integer)';

  -- If older versions had different arg order/types, include additional drops, for example:
  -- execute 'drop function if exists public.map_children_geojson(uuid, text, text, integer, integer)';
  -- execute 'drop function if exists public.map_children_geojson(uuid, text, text, integer)';

exception when others then
  -- Don''t block resets if something weird exists; we just want it gone.
  raise notice 'map_children_geojson drop attempt failed: %', sqlerrm;
end $$;
