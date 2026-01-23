-- ==========================================
-- 1) Normalized metadata tables
-- ==========================================

create table if not exists public.district_metadata (
  entity_id uuid primary key references public.entities(id) on delete cascade,
  sdorgid text null,
  formid text null,
  sdnumber text null,
  sdtype text null,
  prefname text null,
  shortname text null,
  web_url text null,
  acres numeric null,
  sqmiles numeric null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists district_metadata_sdorgid_idx
  on public.district_metadata(sdorgid);

create table if not exists public.school_program_location_metadata (
  entity_id uuid primary key references public.entities(id) on delete cascade,
  orgid text null,
  formid text null,
  orgnumber text null,
  orgtype text null,
  schnumber text null,
  countycode text null,
  graderange text null,
  loctype text null,
  magnet text null,
  pubpriv text null,
  locdistid text null,
  locdistname text null,
  mdeaddr text null,
  mdename text null,
  web_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_program_location_metadata_orgid_idx
  on public.school_program_location_metadata(orgid);

create index if not exists school_program_location_metadata_locdistid_idx
  on public.school_program_location_metadata(locdistid);

create table if not exists public.attendance_area_metadata (
  entity_id uuid primary key references public.entities(id) on delete cascade,
  sdorgid text null,
  elem_multi text null,
  elem_name text null,
  elem_orgid text null,
  midd_multi text null,
  midd_name text null,
  midd_orgid text null,
  high_multi text null,
  high_name text null,
  high_orgid text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attendance_area_metadata_sdorgid_idx
  on public.attendance_area_metadata(sdorgid);

create index if not exists attendance_area_metadata_elem_orgid_idx
  on public.attendance_area_metadata(elem_orgid);

create index if not exists attendance_area_metadata_midd_orgid_idx
  on public.attendance_area_metadata(midd_orgid);

create index if not exists attendance_area_metadata_high_orgid_idx
  on public.attendance_area_metadata(high_orgid);

-- ==========================================
-- 2) Fast lookup indexes on entities.external_ids
--    (so linking can join by sdorgid / orgid without table scans)
-- ==========================================

-- District sdorgid lookup
create index if not exists entities_district_sdorgid_idx
  on public.entities ((external_ids->>'sdorgid'))
  where entity_type = 'district' and external_ids ? 'sdorgid';

-- School orgid lookup (your school script uses external_ids.mde_orgid)
create index if not exists entities_school_mde_orgid_idx
  on public.entities ((external_ids->>'mde_orgid'))
  where entity_type = 'school' and external_ids ? 'mde_orgid';

-- Attendance area sdorgid lookup (if attendance areas are entities)
create index if not exists entities_attendance_area_sdorgid_idx
  on public.entities ((external_ids->>'sdorgid'))
  where entity_type = 'attendance_area' and external_ids ? 'sdorgid';

-- ==========================================
-- 3) Relationship indexes (query speed)
-- ==========================================

-- Typical “children of parent” query:
create index if not exists entity_relationships_parent_type_primary_idx
  on public.entity_relationships (parent_entity_id, relationship_type, is_primary);

-- Typical “parent of child” query:
create index if not exists entity_relationships_child_type_primary_idx
  on public.entity_relationships (child_entity_id, relationship_type, is_primary);

-- Often you’ll ask for “primary contains” quickly:
create index if not exists entity_relationships_contains_primary_idx
  on public.entity_relationships (parent_entity_id, child_entity_id)
  where relationship_type = 'contains' and is_primary = true;

-- ==========================================
-- 4) Geometry indexes (spatial speed)
-- ==========================================

-- Always index geom (GiST). Partial indexes per geometry_type help a lot.
create index if not exists entity_geometries_geom_gist_idx
  on public.entity_geometries using gist (geom);

create index if not exists entity_geometries_boundary_gist_idx
  on public.entity_geometries using gist (geom)
  where geometry_type = 'boundary';

create index if not exists entity_geometries_school_prog_loc_gist_idx
  on public.entity_geometries using gist (geom)
  where geometry_type = 'school_program_locations';

create index if not exists entity_geometries_attendance_areas_gist_idx
  on public.entity_geometries using gist (geom)
  where geometry_type = 'district_attendance_areas';

-- Fast “fetch geometry for entity + type”
create index if not exists entity_geometries_entity_type_idx
  on public.entity_geometries (entity_id, geometry_type);

-- ==========================================
-- 5) updated_at triggers (optional; safe to skip if you already have a pattern)
-- ==========================================
-- If you already have a shared updated_at trigger function, use that instead.
-- Otherwise leave these columns unmanaged for now and constrain later.
