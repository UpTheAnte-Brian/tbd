-- Core branding tables (copied from dev). Ensure schema exists and apply RLS + grants.
begin;

create schema if not exists branding;
create schema if not exists governance;

-- -----------------------------------------------------------------------------
-- Public enums referenced across the app (missing in test)
-- -----------------------------------------------------------------------------

-- campaign_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'campaign_type'
  ) THEN
    CREATE TYPE public.campaign_type AS ENUM ('Primary', 'Secondary');
  END IF;
END $$;

-- org_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'org_type'
  ) THEN
    CREATE TYPE public.org_type AS ENUM ('district_foundation', 'up_the_ante', 'external_charity');
  END IF;
END $$;

-- entity_user_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'entity_user_role'
  ) THEN
    CREATE TYPE public.entity_user_role AS ENUM ('admin', 'editor', 'viewer', 'employee');
  END IF;
END $$;

-- document_visibility enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'document_visibility'
  ) THEN
    CREATE TYPE public.document_visibility AS ENUM ('public', 'internal', 'board_only');
  END IF;
END $$;

-- document_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'document_status'
  ) THEN
    CREATE TYPE public.document_status AS ENUM ('active', 'archived');
  END IF;
END $$;

-- document_version_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'document_version_status'
  ) THEN
    CREATE TYPE public.document_version_status AS ENUM ('draft', 'in_review', 'approved', 'rejected', 'superseded');
  END IF;
END $$;

-- document_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'document_type'
  ) THEN
    CREATE TYPE public.document_type AS ENUM (
      'articles_of_incorporation',
      'irs_determination_letter',
      'ein_letter',
      'bylaws',
      'conflict_of_interest_policy',
      'whistleblower_policy',
      'document_retention_policy',
      'financial_controls_policy',
      'expense_reimbursement_policy',
      'gift_acceptance_policy',
      'grant_management_policy',
      'form_990',
      'state_annual_report',
      'meeting_minutes',
      'other',
      'board_packet'
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Branding enums + helpers (must exist before tables)
-- -----------------------------------------------------------------------------

-- color_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'branding'
      AND t.typname = 'color_role'
  ) THEN
    CREATE TYPE branding.color_role AS ENUM ('primary', 'secondary', 'accent');
  END IF;
END $$;


-- pattern_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'branding'
      AND t.typname = 'pattern_type'
  ) THEN
    CREATE TYPE branding.pattern_type AS ENUM (
      'none',
      'dots',
      'stripes',
      'grid',
      'chevrons',
      'waves'
    );
  END IF;
END $$;

-- logo_category enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'branding'
      AND t.typname = 'logo_category'
  ) THEN
    CREATE TYPE branding.logo_category AS ENUM (
      'full_color',
      'stacked',
      'horizontal',
      'one_color_white',
      'one_color_black',
      'one_color_red',
      'inverse',
      'pattern_small',
      'pattern_large',
      'other'
    );
  END IF;
END $$;

-- logo_subcategory enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'branding'
      AND t.typname = 'logo_subcategory'
  ) THEN
    CREATE TYPE branding.logo_subcategory AS ENUM (
      'district_primary',
      'district_secondary',
      'icon',
      'school_logo',
      'community_ed',
      'athletics_primary',
      'athletics_icon',
      'athletics_wordmark',
      'script_wordmark',
      'wings_up',
      'team_logo',
      'brand_pattern',
      'retired',
      'primary_logo',
      'secondary_logo',
      'wordmark',
      'seal',
      'co_brand',
      'event',
      'program'
    );
  END IF;
END $$;

-- typography_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'branding'
      AND t.typname = 'typography_role'
  ) THEN
    CREATE TYPE branding.typography_role AS ENUM (
      'header1',
      'header2',
      'subheader',
      'body',
      'logo',
      'display'
    );
  END IF;
END $$;

-- governance.approval_target_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'governance'
      AND t.typname = 'approval_target_type'
  ) THEN
    CREATE TYPE governance.approval_target_type AS ENUM (
      'meeting_minutes',
      'document_version',
      'motion'
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Core membership table (missing in test)
-- -----------------------------------------------------------------------------

create table if not exists public.entity_users (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  role public.entity_user_role not null,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  entity_id uuid not null,
  constraint entity_users_pkey primary key (id),
  constraint entity_users_entity_id_user_id_key unique (entity_id, user_id),
  constraint entity_users_entity_ref_id_fk foreign KEY (entity_id) references entities (id),
  constraint entity_users_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint entity_users_status_check check (
    (
      status = any (
        array['active'::text, 'invited'::text, 'removed'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists entity_users_entity_id_idx on public.entity_users using btree (entity_id) TABLESPACE pg_default;
create index IF not exists entity_users_user_id_idx on public.entity_users using btree (user_id) TABLESPACE pg_default;


-- -----------------------------------------------------------------------------
-- Public helper functions required by branding RLS
-- -----------------------------------------------------------------------------
-- These are referenced by policies below (e.g. `is_global_admin(auth.uid())` and
-- `can_manage_entity_assets(auth.uid(), entity_id)`).
--
-- NOTE: Dev appears to have duplicate overloads that take (entity_type, entity_id)
-- and/or implicitly use auth.uid(). We standardize on (user_id, entity_id) and
-- provide lightweight overloads for backwards compatibility.

CREATE OR REPLACE FUNCTION public.is_global_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'admin'
  );
$$;

-- Preferred signature: (user_id, entity_id)
CREATE OR REPLACE FUNCTION public.is_entity_admin(p_user_id uuid, p_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  select exists (
    select 1
    from public.entity_users eu
    where eu.entity_id = p_entity_id
      and eu.user_id = p_user_id
      and eu.role = 'admin'
      and eu.status = 'active'
  );
$$;


-- Preferred signature: (user_id, entity_id)
CREATE OR REPLACE FUNCTION public.is_entity_user(p_user_id uuid, p_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  select exists (
    select 1
    from public.entity_users eu
    where eu.entity_id = p_entity_id
      and eu.user_id = p_user_id
      and eu.status = 'active'
  );
$$;


CREATE OR REPLACE FUNCTION public.can_manage_entity_assets(p_user_id uuid, p_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  select public.is_global_admin(p_user_id)
      or public.is_entity_admin(p_user_id, p_entity_id);
$$;


-- Keep policies aligned with what you're seeing in the dashboard (but with RLS enabled).
alter table if exists public.entity_users enable row level security;

drop policy if exists entity_users_select_self on public.entity_users;
create policy entity_users_select_self on public.entity_users
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists entity_users_insert_admin on public.entity_users;
create policy entity_users_insert_admin on public.entity_users
  for insert to authenticated
  with check (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(auth.uid(), entity_id)
  );

drop policy if exists entity_users_update_admin on public.entity_users;
create policy entity_users_update_admin on public.entity_users
  for update to authenticated
  using (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(auth.uid(), entity_id)
  )
  with check (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(auth.uid(), entity_id)
  );

drop policy if exists entity_users_delete_admin on public.entity_users;
create policy entity_users_delete_admin on public.entity_users
  for delete to authenticated
  using (
    public.is_global_admin(auth.uid())
    or public.is_entity_admin(auth.uid(), entity_id)
  );

-- Grants (match your pattern: public read; service_role write)
grant select on public.entity_users to authenticated;
grant all on public.entity_users to service_role;


create table if not exists branding.asset_categories (
  id uuid not null default gen_random_uuid (),
  key text not null,
  label text not null,
  description text null,
  asset_kind text not null default 'image'::text,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint asset_categories_pkey primary key (id),
  constraint asset_categories_key_key unique (key)
) TABLESPACE pg_default;

drop trigger if exists trg_asset_categories_updated_at on branding.asset_categories;
create trigger trg_asset_categories_updated_at BEFORE
update on branding.asset_categories for EACH row
execute FUNCTION set_updated_at ();

create table if not exists branding.asset_subcategories (
  id uuid not null default gen_random_uuid (),
  category_id uuid not null,
  key text not null,
  label text not null,
  description text null,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint asset_subcategories_pkey primary key (id),
  constraint asset_subcategories_category_id_key_key unique (category_id, key),
  constraint asset_subcategories_category_id_fkey foreign KEY (category_id) references branding.asset_categories (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists asset_subcategories_category_id_idx on branding.asset_subcategories using btree (category_id) TABLESPACE pg_default;

drop trigger if exists trg_asset_subcategories_updated_at on branding.asset_subcategories;
create trigger trg_asset_subcategories_updated_at BEFORE
update on branding.asset_subcategories for EACH row
execute FUNCTION set_updated_at ();

create table if not exists branding.asset_slots (
  id uuid not null default gen_random_uuid (),
  entity_type text not null,
  category_id uuid not null,
  subcategory_id uuid null,
  label_override text null,
  help_text text null,
  sort_order integer not null default 100,
  is_required boolean not null default false,
  max_assets integer not null default 1,
  allowed_mime_types text[] not null default array[]::text[],
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint asset_slots_pkey primary key (id),
  constraint asset_slots_category_id_fkey foreign KEY (category_id) references branding.asset_categories (id),
  constraint asset_slots_entity_type_fkey foreign KEY (entity_type) references entity_types (key),
  constraint asset_slots_subcategory_id_fkey foreign KEY (subcategory_id) references branding.asset_subcategories (id)
) TABLESPACE pg_default;

create unique INDEX IF not exists asset_slots_entity_category_subcategory_uidx on branding.asset_slots using btree (
  entity_type,
  category_id,
  COALESCE(
    subcategory_id,
    '00000000-0000-0000-0000-000000000000'::uuid
  )
) TABLESPACE pg_default;

create index IF not exists asset_slots_entity_type_idx on branding.asset_slots using btree (entity_type) TABLESPACE pg_default;

drop trigger if exists trg_asset_slots_updated_at on branding.asset_slots;
create trigger trg_asset_slots_updated_at BEFORE
update on branding.asset_slots for EACH row
execute FUNCTION set_updated_at ();

create table if not exists branding.assets (
  id uuid not null default gen_random_uuid (),
  entity_id uuid not null,
  category_id uuid not null,
  subcategory_id uuid null,
  name text not null,
  description text null,
  bucket text not null default 'branding-assets'::text,
  path text not null,
  mime_type text null,
  size_bytes bigint null,
  width_px integer null,
  height_px integer null,
  is_retired boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint assets_pkey primary key (id),
  constraint assets_category_id_fkey foreign KEY (category_id) references branding.asset_categories (id),
  constraint assets_entity_id_fkey foreign KEY (entity_id) references entities (id) on delete CASCADE,
  constraint assets_subcategory_id_fkey foreign KEY (subcategory_id) references branding.asset_subcategories (id)
) TABLESPACE pg_default;

create index IF not exists assets_entity_id_idx on branding.assets using btree (entity_id) TABLESPACE pg_default;

create index IF not exists assets_category_id_idx on branding.assets using btree (category_id) TABLESPACE pg_default;

create index IF not exists assets_subcategory_id_idx on branding.assets using btree (subcategory_id) TABLESPACE pg_default;

create unique INDEX IF not exists assets_entity_category_subcategory_uidx on branding.assets using btree (
  entity_id,
  category_id,
  COALESCE(
    subcategory_id,
    '00000000-0000-0000-0000-000000000000'::uuid
  )
) TABLESPACE pg_default
where
  (is_retired = false);

drop trigger if exists trg_assets_updated_at on branding.assets;
create trigger trg_assets_updated_at BEFORE
update on branding.assets for EACH row
execute FUNCTION set_updated_at ();

create table if not exists branding.palettes (
  id uuid not null default gen_random_uuid (),
  name text not null,
  role branding.color_role not null,
  usage_notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  entity_id uuid not null,
  constraint palettes_pkey primary key (id),
  constraint branding_palettes_entity_role_unique unique (entity_id, role),
  constraint palettes_entity_id_fk foreign KEY (entity_id) references entities (id)
) TABLESPACE pg_default;

create index IF not exists palettes_entity_id_idx on branding.palettes using btree (entity_id) TABLESPACE pg_default;

drop trigger if exists trg_palettes_updated_at on branding.palettes;
create trigger trg_palettes_updated_at BEFORE
update on branding.palettes for EACH row
execute FUNCTION set_updated_at();

create table if not exists branding.palette_colors (
  id uuid not null default gen_random_uuid (),
  palette_id uuid not null,
  slot integer not null,
  hex text not null,
  label text null,
  usage_notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint palette_colors_pkey primary key (id),
  constraint palette_colors_palette_slot_unique unique (palette_id, slot),
  constraint palette_colors_palette_fk foreign KEY (palette_id) references branding.palettes (id) on delete CASCADE,
  constraint palette_colors_hex_format_check check ((hex ~* '^#[0-9a-f]{6}$'::text))
) TABLESPACE pg_default;

create index IF not exists palette_colors_palette_id_idx on branding.palette_colors using btree (palette_id) TABLESPACE pg_default;

drop trigger if exists trg_palette_colors_updated_at on branding.palette_colors;
create trigger trg_palette_colors_updated_at BEFORE
update on branding.palette_colors for EACH row
execute FUNCTION set_updated_at();

create table if not exists branding.patterns (
  id uuid not null default gen_random_uuid (),
  pattern_type branding.pattern_type not null,
  allowed_colors text[] null,
  file_png text null,
  file_svg text null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  entity_id uuid not null,
  constraint patterns_pkey primary key (id),
  constraint patterns_entity_fk foreign KEY (entity_id) references entities (id) on delete CASCADE
) TABLESPACE pg_default;

create unique INDEX IF not exists patterns_entity_pattern_unique on branding.patterns using btree (entity_id, pattern_type) TABLESPACE pg_default;

drop trigger if exists trg_patterns_updated_at on branding.patterns;
create trigger trg_patterns_updated_at BEFORE
update on branding.patterns for EACH row
execute FUNCTION set_updated_at();

create table if not exists branding.typography (
  id uuid not null default gen_random_uuid (),
  font_name text not null,
  weights jsonb null,
  download_url text null,
  usage_rules text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  availability text null,
  role branding.typography_role not null default 'body'::branding.typography_role,
  entity_id uuid not null,
  constraint typography_pkey primary key (id),
  constraint typography_entity_id_fk foreign KEY (entity_id) references entities (id),
  constraint typography_availability_check check (
    (
      availability = any (
        array['system'::text, 'google'::text, 'licensed'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists typography_entity_id_idx on branding.typography using btree (entity_id) TABLESPACE pg_default;

drop trigger if exists trg_typography_updated_at on branding.typography;
create trigger trg_typography_updated_at BEFORE
update on branding.typography for EACH row
execute FUNCTION set_updated_at();


-- Grants: public can read, only service_role can write.
grant usage on schema branding to anon, authenticated, service_role;

-- Tables
grant select on all tables in schema branding to anon, authenticated;
grant all on all tables in schema branding to service_role;

-- Routines (functions)
grant execute on all functions in schema branding to anon, authenticated;
grant all on all functions in schema branding to service_role;

-- Sequences
grant usage, select on all sequences in schema branding to anon, authenticated;
grant all on all sequences in schema branding to service_role;

-- Default privileges for future objects created by postgres in branding
alter default privileges for role postgres in schema branding grant select on tables to anon, authenticated;
alter default privileges for role postgres in schema branding grant all on tables to service_role;

alter default privileges for role postgres in schema branding grant execute on functions to anon, authenticated;
alter default privileges for role postgres in schema branding grant all on functions to service_role;

alter default privileges for role postgres in schema branding grant usage, select on sequences to anon, authenticated;
alter default privileges for role postgres in schema branding grant all on sequences to service_role;

-- RLS: enabled on all branding tables
alter table if exists branding.asset_categories enable row level security;
alter table if exists branding.asset_subcategories enable row level security;
alter table if exists branding.asset_slots enable row level security;
alter table if exists branding.assets enable row level security;
alter table if exists branding.palettes enable row level security;
alter table if exists branding.palette_colors enable row level security;
alter table if exists branding.patterns enable row level security;
alter table if exists branding.typography enable row level security;

-- Public read policies
drop policy if exists branding_asset_categories_select on branding.asset_categories;
create policy branding_asset_categories_select on branding.asset_categories
  for select to anon, authenticated
  using (true);

drop policy if exists branding_asset_subcategories_select on branding.asset_subcategories;
create policy branding_asset_subcategories_select on branding.asset_subcategories
  for select to anon, authenticated
  using (true);

drop policy if exists branding_asset_slots_select on branding.asset_slots;
create policy branding_asset_slots_select on branding.asset_slots
  for select to anon, authenticated
  using (true);

drop policy if exists branding_assets_select on branding.assets;
create policy branding_assets_select on branding.assets
  for select to public
  using (true);

drop policy if exists branding_palettes_select on branding.palettes;
create policy branding_palettes_select on branding.palettes
  for select to public
  using (true);

drop policy if exists branding_palette_colors_select on branding.palette_colors;
create policy branding_palette_colors_select on branding.palette_colors
  for select to public
  using (true);

drop policy if exists branding_patterns_select on branding.patterns;
create policy branding_patterns_select on branding.patterns
  for select to public
  using (true);

drop policy if exists branding_typography_select on branding.typography;
create policy branding_typography_select on branding.typography
  for select to public
  using (true);

-- Write policies
--
-- Rules of thumb:
-- - Catalog tables (asset_categories/subcategories/slots) are admin-only.
-- - Entity-owned rows (assets/palettes/palette_colors/patterns/typography) are writable
--   only by users who can manage assets for the associated entity.
--
-- This matches the dashboard approach you screenshotted for branding.assets.

-- asset_categories (admin-only)
DROP POLICY IF EXISTS branding_asset_categories_write ON branding.asset_categories;
CREATE POLICY branding_asset_categories_write ON branding.asset_categories
  FOR ALL TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

-- asset_subcategories (admin-only)
DROP POLICY IF EXISTS branding_asset_subcategories_write ON branding.asset_subcategories;
CREATE POLICY branding_asset_subcategories_write ON branding.asset_subcategories
  FOR ALL TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

-- asset_slots (admin-only)
DROP POLICY IF EXISTS branding_asset_slots_write ON branding.asset_slots;
CREATE POLICY branding_asset_slots_write ON branding.asset_slots
  FOR ALL TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));

-- assets (entity-admin)
DROP POLICY IF EXISTS branding_assets_insert ON branding.assets;
CREATE POLICY branding_assets_insert ON branding.assets
  FOR INSERT TO authenticated
  WITH CHECK (can_manage_entity_assets(auth.uid(), entity_id));

DROP POLICY IF EXISTS branding_assets_update ON branding.assets;
CREATE POLICY branding_assets_update ON branding.assets
  FOR UPDATE TO authenticated
  USING (can_manage_entity_assets(auth.uid(), entity_id))
  WITH CHECK (can_manage_entity_assets(auth.uid(), entity_id));

DROP POLICY IF EXISTS branding_assets_delete ON branding.assets;
CREATE POLICY branding_assets_delete ON branding.assets
  FOR DELETE TO authenticated
  USING (can_manage_entity_assets(auth.uid(), entity_id));

-- palettes (entity-admin)
DROP POLICY IF EXISTS branding_palettes_insert ON branding.palettes;
CREATE POLICY branding_palettes_insert ON branding.palettes
  FOR INSERT TO authenticated
  WITH CHECK (can_manage_entity_assets(auth.uid(), entity_id));

DROP POLICY IF EXISTS branding_palettes_update ON branding.palettes;
CREATE POLICY branding_palettes_update ON branding.palettes
  FOR UPDATE TO authenticated
  USING (can_manage_entity_assets(auth.uid(), entity_id))
  WITH CHECK (can_manage_entity_assets(auth.uid(), entity_id));

DROP POLICY IF EXISTS branding_palettes_delete ON branding.palettes;
CREATE POLICY branding_palettes_delete ON branding.palettes
  FOR DELETE TO authenticated
  USING (can_manage_entity_assets(auth.uid(), entity_id));

-- palette_colors (entity-admin via parent palette)
DROP POLICY IF EXISTS branding_palette_colors_insert ON branding.palette_colors;
CREATE POLICY branding_palette_colors_insert ON branding.palette_colors
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM branding.palettes p
      WHERE p.id = palette_id
        AND can_manage_entity_assets(auth.uid(), p.entity_id)
    )
  );

DROP POLICY IF EXISTS branding_palette_colors_update ON branding.palette_colors;
CREATE POLICY branding_palette_colors_update ON branding.palette_colors
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM branding.palettes p
      WHERE p.id = palette_id
        AND can_manage_entity_assets(auth.uid(), p.entity_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM branding.palettes p
      WHERE p.id = palette_id
        AND can_manage_entity_assets(auth.uid(), p.entity_id)
    )
  );

DROP POLICY IF EXISTS branding_palette_colors_delete ON branding.palette_colors;
CREATE POLICY branding_palette_colors_delete ON branding.palette_colors
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM branding.palettes p
      WHERE p.id = palette_id
        AND can_manage_entity_assets(auth.uid(), p.entity_id)
    )
  );

-- patterns (entity-admin)
DROP POLICY IF EXISTS branding_patterns_insert ON branding.patterns;
CREATE POLICY branding_patterns_insert ON branding.patterns
  FOR INSERT TO authenticated
  WITH CHECK (can_manage_entity_assets(auth.uid(), entity_id));

DROP POLICY IF EXISTS branding_patterns_update ON branding.patterns;
CREATE POLICY branding_patterns_update ON branding.patterns
  FOR UPDATE TO authenticated
  USING (can_manage_entity_assets(auth.uid(), entity_id))
  WITH CHECK (can_manage_entity_assets(auth.uid(), entity_id));

DROP POLICY IF EXISTS branding_patterns_delete ON branding.patterns;
CREATE POLICY branding_patterns_delete ON branding.patterns
  FOR DELETE TO authenticated
  USING (can_manage_entity_assets(auth.uid(), entity_id));

-- typography (entity-admin)
DROP POLICY IF EXISTS branding_typography_insert ON branding.typography;
CREATE POLICY branding_typography_insert ON branding.typography
  FOR INSERT TO authenticated
  WITH CHECK (can_manage_entity_assets(auth.uid(), entity_id));

DROP POLICY IF EXISTS branding_typography_update ON branding.typography;
CREATE POLICY branding_typography_update ON branding.typography
  FOR UPDATE TO authenticated
  USING (can_manage_entity_assets(auth.uid(), entity_id))
  WITH CHECK (can_manage_entity_assets(auth.uid(), entity_id));

DROP POLICY IF EXISTS branding_typography_delete ON branding.typography;
CREATE POLICY branding_typography_delete ON branding.typography
  FOR DELETE TO authenticated
  USING (can_manage_entity_assets(auth.uid(), entity_id));

-- Optional hardening: prevent any writes via anon
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA branding FROM anon;

-- ensure uniqueness per entity/role
create unique index if not exists typography_entity_role_uidx
  on branding.typography(entity_id, role);

-- Drop legacy (entity_type, entity_id) overloads if they exist in the target DB
drop function if exists public.is_entity_admin(text, uuid);
drop function if exists public.is_entity_user(text, uuid);

commit;
