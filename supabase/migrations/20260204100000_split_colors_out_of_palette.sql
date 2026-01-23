-- -----------------------------------------------------------------------------
-- Normalize branding palettes: move colors into branding.palette_colors
-- -----------------------------------------------------------------------------

begin;

create schema if not exists branding;

-- 1) Create new child table
create table if not exists branding.palette_colors (
  id uuid not null default gen_random_uuid(),
  palette_id uuid not null,
  slot integer not null,
  hex text not null,
  label text null,
  usage_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint palette_colors_pkey primary key (id),
  constraint palette_colors_palette_fk foreign key (palette_id)
    references branding.palettes (id)
    on delete cascade,
  constraint palette_colors_palette_slot_unique unique (palette_id, slot),
  constraint palette_colors_hex_format_check check (hex ~* '^#[0-9a-f]{6}$')
);

create index if not exists palette_colors_palette_id_idx
  on branding.palette_colors using btree (palette_id);

-- Touch trigger for updated_at (reuse your existing function)
drop trigger if exists trg_touch_palette_colors on branding.palette_colors;
create trigger trg_touch_palette_colors
before update on branding.palette_colors
for each row execute function branding.touch_updated_at();


-- 2) Backfill palette_colors from palettes.colors (jsonb array of hex strings)
--    This assumes palettes.colors is like ["#CE4040", "#FFFFFF", ...]
insert into branding.palette_colors (palette_id, slot, hex)
select
  p.id as palette_id,
  c.ord - 1 as slot,
  upper(c.val) as hex
from branding.palettes p
cross join lateral (
  select ord, val
  from jsonb_array_elements_text(p.colors) with ordinality as t(val, ord)
) c
where p.colors is not null
  and jsonb_typeof(p.colors) = 'array'
on conflict (palette_id, slot) do update
set hex = excluded.hex;

-- 3) Optional: Seed default labels for slot 0/1/2 (only if you want)
-- update branding.palette_colors
-- set label = case slot
--   when 0 then 'Slot 0'
--   when 1 then 'Slot 1'
--   when 2 then 'Slot 2'
--   else label
-- end
-- where label is null;


-- 4) Schema cleanup on branding.palettes
-- 4a) Drop redundant CHECK constraint on role (role is already an enum)
alter table branding.palettes
  drop constraint if exists branding_palettes_role_check;

-- 4b) Drop redundant unique index (unique constraint already covers it)
drop index if exists branding.palettes_entity_role_uidx;
drop index if exists palettes_entity_role_uidx;

-- 4c) Drop unused columns
alter table branding.palettes
  drop column if exists colors,
  drop column if exists hex,
  drop column if exists rgb,
  drop column if exists cmyk,
  drop column if exists pms;

commit;