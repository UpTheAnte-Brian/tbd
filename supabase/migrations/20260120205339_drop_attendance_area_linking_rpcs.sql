-- Path A: attendance areas are not entities, so these linking RPCs are not used.

drop function if exists public.link_attendance_areas_to_districts(int, int);
drop function if exists public.link_attendance_areas_to_schools(int, int);
