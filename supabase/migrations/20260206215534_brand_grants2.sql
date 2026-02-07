-- allow roles to see the schema
grant usage on schema branding to anon, authenticated;

-- reads (your UI probably needs this widely)
grant select on all tables in schema branding to anon, authenticated;

-- writes (lock to authenticated; RLS still controls *which rows*)
grant insert, update, delete on all tables in schema branding to authenticated;

-- if you have functions used by the client
grant execute on all functions in schema branding to anon, authenticated;

-- make future tables/functions inherit the same grants
alter default privileges in schema branding
grant select on tables to anon, authenticated;

alter default privileges in schema branding
grant insert, update, delete on tables to authenticated;

alter default privileges in schema branding
grant execute on functions to anon, authenticated;

-- RLS
alter table if exists branding.palettes enable row level security;
alter table if exists branding.palette_colors enable row level security;

-- Palettes: anyone can read, only managers can write

drop policy if exists branding_palettes_select on branding.palettes;
create policy branding_palettes_select
  on branding.palettes
  for select
  to anon, authenticated
  using (true);

drop policy if exists branding_palettes_insert on branding.palettes;
create policy branding_palettes_insert
  on branding.palettes
  for insert
  to authenticated
  with check (can_manage_entity_assets(auth.uid(), entity_id));

drop policy if exists branding_palettes_update on branding.palettes;
create policy branding_palettes_update
  on branding.palettes
  for update
  to authenticated
  using (can_manage_entity_assets(auth.uid(), entity_id))
  with check (can_manage_entity_assets(auth.uid(), entity_id));

drop policy if exists branding_palettes_delete on branding.palettes;
create policy branding_palettes_delete
  on branding.palettes
  for delete
  to authenticated
  using (can_manage_entity_assets(auth.uid(), entity_id));

-- Palette colors: anyone can read, only managers of the parent palette's entity can write

drop policy if exists branding_palette_colors_select on branding.palette_colors;
create policy branding_palette_colors_select
  on branding.palette_colors
  for select
  to anon, authenticated
  using (true);

drop policy if exists branding_palette_colors_insert on branding.palette_colors;
create policy branding_palette_colors_insert
  on branding.palette_colors
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from branding.palettes p
      where p.id = palette_colors.palette_id
        and can_manage_entity_assets(auth.uid(), p.entity_id)
    )
  );

drop policy if exists branding_palette_colors_update on branding.palette_colors;
create policy branding_palette_colors_update
  on branding.palette_colors
  for update
  to authenticated
  using (
    exists (
      select 1
      from branding.palettes p
      where p.id = palette_colors.palette_id
        and can_manage_entity_assets(auth.uid(), p.entity_id)
    )
  )
  with check (
    exists (
      select 1
      from branding.palettes p
      where p.id = palette_colors.palette_id
        and can_manage_entity_assets(auth.uid(), p.entity_id)
    )
  );

drop policy if exists branding_palette_colors_delete on branding.palette_colors;
create policy branding_palette_colors_delete
  on branding.palette_colors
  for delete
  to authenticated
  using (
    exists (
      select 1
      from branding.palettes p
      where p.id = palette_colors.palette_id
        and can_manage_entity_assets(auth.uid(), p.entity_id)
    )
  );


-- Note: other branding tables (assets, asset_slots, etc.) already have their own RLS policies.
-- This migration primarily ensures palettes + palette_colors have write policies matching can_manage_entity_assets().