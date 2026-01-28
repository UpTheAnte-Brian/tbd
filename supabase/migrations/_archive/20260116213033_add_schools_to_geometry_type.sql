-- Add school_program_locations to allowed geometry types
alter table if exists public.entity_geometries
  drop constraint if exists entity_geometries_geom_type_check;

alter table if exists public.entity_geometries
  add constraint entity_geometries_geom_type_check
  check (
    geometry_type = any (
      array[
        'boundary'::text,
        'point'::text,
        'service_area'::text,
        'district_attendance_areas'::text,
        'school_program_locations'::text
      ]
    )
  );
