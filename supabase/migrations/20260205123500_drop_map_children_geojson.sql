-- Drop deprecated map_children_geojson RPC variants.

drop function if exists public.map_children_geojson(uuid, text, text, text, integer, integer);
drop function if exists public.map_children_geojson(uuid, text, text, text);
