-- Drop attendance_area_metadata (Path A: attendance areas are not entities; info comes from GeoJSON feature properties)

do $$
begin
  -- Drop indexes first (names may vary; IF EXISTS makes this safe)
  execute 'drop index if exists public.attendance_area_metadata_entity_id_idx';
  execute 'drop index if exists public.attendance_area_metadata_sdorgid_idx';
  execute 'drop index if exists public.attendance_area_metadata_elem_orgid_idx';
  execute 'drop index if exists public.attendance_area_metadata_midd_orgid_idx';
  execute 'drop index if exists public.attendance_area_metadata_high_orgid_idx';
exception when others then
  -- Ignore if index names differ; table drop will remove dependent indexes anyway
  null;
end $$;

drop table if exists public.attendance_area_metadata;
