-- Reset branding tables to use entity_id/entity_type instead of district_id, wiping existing data.
-- Assumptions:
--  - public.entity_types exists with keys: district, nonprofit, business
--  - branding schema tables may or may not exist in fresh environments
--  - Ok to TRUNCATE branding tables to simplify migration

DO $$
BEGIN
  -- In fresh environments (e.g., Supabase shadow DB used by `supabase db diff`), the branding schema
  -- may not exist yet. If it doesn't exist, skip this migration entirely.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'branding'
  ) THEN
    RAISE NOTICE 'Skipping 20251220004000_branding_entity_ref_reset: schema "branding" does not exist.';
    RETURN;
  END IF;

  -- 1) Drop legacy constraints on district_id
  EXECUTE 'alter table if exists branding.logos drop constraint if exists logos_district_id_fkey';
  EXECUTE 'alter table if exists branding.palettes drop constraint if exists palettes_district_id_fkey';
  EXECUTE 'alter table if exists branding.patterns drop constraint if exists patterns_district_id_fkey';
  EXECUTE 'alter table if exists branding.typography drop constraint if exists typography_district_id_fkey';
  EXECUTE 'alter table if exists branding.schools drop constraint if exists schools_district_id_fkey';

  -- 2) Truncate data (safe reset)
  IF to_regclass('branding.logos') IS NOT NULL THEN
    EXECUTE 'truncate table branding.logos cascade';
  END IF;

  IF to_regclass('branding.palettes') IS NOT NULL THEN
    EXECUTE 'truncate table branding.palettes cascade';
  END IF;

  IF to_regclass('branding.patterns') IS NOT NULL THEN
    EXECUTE 'truncate table branding.patterns cascade';
  END IF;

  IF to_regclass('branding.typography') IS NOT NULL THEN
    EXECUTE 'truncate table branding.typography cascade';
  END IF;

  IF to_regclass('branding.schools') IS NOT NULL THEN
    EXECUTE 'truncate table branding.schools cascade';
  END IF;

  -- 3) Ensure entity linkage columns exist
  EXECUTE 'alter table if exists branding.logos add column if not exists entity_id uuid, add column if not exists entity_type text';
  EXECUTE 'alter table if exists branding.palettes add column if not exists entity_id uuid, add column if not exists entity_type text';
  EXECUTE 'alter table if exists branding.patterns add column if not exists entity_id uuid, add column if not exists entity_type text';
  EXECUTE 'alter table if exists branding.typography add column if not exists entity_id uuid, add column if not exists entity_type text';
  EXECUTE 'alter table if exists branding.schools add column if not exists entity_id uuid, add column if not exists entity_type text';

  -- 4) Drop old district_id columns
  EXECUTE 'alter table if exists branding.logos drop column if exists district_id';
  EXECUTE 'alter table if exists branding.palettes drop column if exists district_id';
  EXECUTE 'alter table if exists branding.patterns drop column if exists district_id';
  EXECUTE 'alter table if exists branding.typography drop column if exists district_id';
  EXECUTE 'alter table if exists branding.schools drop column if exists district_id';

  -- 5) Enforce entity_type FK to entity_types
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branding_logos_entity_type_fkey') THEN
    EXECUTE 'alter table if exists branding.logos add constraint branding_logos_entity_type_fkey foreign key (entity_type) references public.entity_types(key) on update cascade on delete restrict';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branding_palettes_entity_type_fkey') THEN
    EXECUTE 'alter table if exists branding.palettes add constraint branding_palettes_entity_type_fkey foreign key (entity_type) references public.entity_types(key) on update cascade on delete restrict';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branding_patterns_entity_type_fkey') THEN
    EXECUTE 'alter table if exists branding.patterns add constraint branding_patterns_entity_type_fkey foreign key (entity_type) references public.entity_types(key) on update cascade on delete restrict';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branding_typography_entity_type_fkey') THEN
    EXECUTE 'alter table if exists branding.typography add constraint branding_typography_entity_type_fkey foreign key (entity_type) references public.entity_types(key) on update cascade on delete restrict';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branding_schools_entity_type_fkey') THEN
    EXECUTE 'alter table if exists branding.schools add constraint branding_schools_entity_type_fkey foreign key (entity_type) references public.entity_types(key) on update cascade on delete restrict';
  END IF;

  -- 6) Make entity_id/entity_type required for core tables
  EXECUTE 'alter table if exists branding.logos alter column entity_id set not null';
  EXECUTE 'alter table if exists branding.logos alter column entity_type set not null';
  EXECUTE 'alter table if exists branding.palettes alter column entity_id set not null';
  EXECUTE 'alter table if exists branding.palettes alter column entity_type set not null';
  EXECUTE 'alter table if exists branding.patterns alter column entity_id set not null';
  EXECUTE 'alter table if exists branding.patterns alter column entity_type set not null';
  EXECUTE 'alter table if exists branding.typography alter column entity_id set not null';
  EXECUTE 'alter table if exists branding.typography alter column entity_type set not null';
  -- Schools may remain optional; leave entity_id/type nullable if needed.

  -- 7) Indexes for lookups by entity
  IF to_regclass('branding.logos') IS NOT NULL THEN
    EXECUTE 'create index if not exists logos_entity_idx on branding.logos (entity_type, entity_id)';
  END IF;

  IF to_regclass('branding.palettes') IS NOT NULL THEN
    EXECUTE 'create index if not exists palettes_entity_idx on branding.palettes (entity_type, entity_id)';
  END IF;

  IF to_regclass('branding.patterns') IS NOT NULL THEN
    EXECUTE 'create index if not exists patterns_entity_idx on branding.patterns (entity_type, entity_id)';
  END IF;

  IF to_regclass('branding.typography') IS NOT NULL THEN
    EXECUTE 'create index if not exists typography_entity_idx on branding.typography (entity_type, entity_id)';
  END IF;

  IF to_regclass('branding.schools') IS NOT NULL THEN
    EXECUTE 'create index if not exists schools_entity_idx on branding.schools (entity_type, entity_id)';
  END IF;

  -- Comments (safe even if columns already exist)
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'branding'
      AND table_name = 'logos'
  ) THEN
    EXECUTE $comment$comment on column branding.logos.entity_type is 'References public.entity_types.key'$comment$;
    EXECUTE $comment$comment on column branding.logos.entity_id is 'References the entity row (district/nonprofit/business)'$comment$;
  END IF;
END $$;
