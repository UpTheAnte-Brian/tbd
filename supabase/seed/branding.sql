-- CHANGE THIS
-- Westonka (example)
\set entity_id '7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e'

insert into branding.palettes (entity_id, role, name)
values
  (:'entity_id', 'primary',   'Primary Palette'),
  (:'entity_id', 'secondary', 'Secondary Palette'),
  (:'entity_id', 'accent',    'Accent Palette')
on conflict (entity_id, role) do nothing;

-- Palette colors are **3 per role** (slot 0/1/2) to match Tailwind tokens:
--   --brand-primary-0/1/2, --brand-secondary-0/1/2, --brand-accent-0/1/2
-- Slot semantics (convention):
--   0 = base / brand color
--   1 = contrast (often white for primary)
--   2 = alternate / darker / supporting shade

-- PRIMARY (brand-primary-0/1/2)
insert into branding.palette_colors (palette_id, slot, hex, label)
select p.id, s.slot, s.hex, s.label
from branding.palettes p
join (values
  (0, '#da2b1f', 'Primary 0'),
  (1, '#ffffff', 'Primary 1'),
  (2, '#b51f17', 'Primary 2')
) s(slot, hex, label) on true
where p.entity_id = :'entity_id'
  and p.role = 'primary'
on conflict (palette_id, slot) do nothing;

-- SECONDARY (brand-secondary-0/1/2)
insert into branding.palette_colors (palette_id, slot, hex, label)
select p.id, s.slot, s.hex, s.label
from branding.palettes p
join (values
  (0, '#50534c', 'Secondary 0'),
  (1, '#2c2a29', 'Secondary 1'),
  (2, '#a7a9b4', 'Secondary 2')
) s(slot, hex, label) on true
where p.entity_id = :'entity_id'
  and p.role = 'secondary'
on conflict (palette_id, slot) do nothing;

-- ACCENT (brand-accent-0/1/2)
insert into branding.palette_colors (palette_id, slot, hex, label)
select p.id, s.slot, s.hex, s.label
from branding.palettes p
join (values
  (0, '#94292e', 'Accent 0'),
  (1, '#ff3a1e', 'Accent 1'),
  (2, '#6d3235', 'Accent 2')
) s(slot, hex, label) on true
where p.entity_id = :'entity_id'
  and p.role = 'accent'
on conflict (palette_id, slot) do nothing;

insert into branding.typography (
  entity_id,
  role,
  font_name,
  availability,
  weights,
  usage_rules
)
values
  (:'entity_id', 'display',   'Inter', 'google', '{"700": "bold"}', 'Hero text'),
  (:'entity_id', 'header',    'Inter', 'google', '{"700": "bold"}', 'Section headers'),
  (:'entity_id', 'header2',   'Inter', 'google', '{"600": "semibold"}', null),
  (:'entity_id', 'subheader', 'Inter', 'google', '{"500": "medium"}', null),
  (:'entity_id', 'body',      'Inter', 'google', '{"400": "regular"}', 'Default body'),
  (:'entity_id', 'logo',      'Inter', 'google', '{"700": "bold"}', 'Logotype only')
on conflict (entity_id, role) do nothing;

insert into branding.patterns (
  entity_id,
  pattern_type,
  notes
)
values
  (:'entity_id', 'none',     'No pattern'),
  (:'entity_id', 'dots',     'Subtle dot texture'),
  (:'entity_id', 'stripes',  'Diagonal stripes'),
  (:'entity_id', 'grid',     'Grid pattern'),
  (:'entity_id', 'chevrons', 'Chevron motif'),
  (:'entity_id', 'waves',    'Wave pattern')
on conflict (entity_id, pattern_type) do nothing;

insert into branding.asset_categories (key, label, description)
values
  ('logo',   'Logos',   'Official logos and marks'),
  ('brand',  'Brand',  'Brand patterns and assets'),
  ('photo',  'Photos', 'Photography and imagery'),
  ('doc',    'Docs',   'Brand documents')
on conflict (key) do nothing;

insert into branding.asset_subcategories (category_id, key, label)
select c.id, s.key, s.label
from branding.asset_categories c
join (values
  ('logo',  'primary_logo',   'Primary Logo'),
  ('logo',  'secondary_logo', 'Secondary Logo'),
  ('logo',  'wordmark',       'Wordmark'),
  ('logo',  'seal',           'Seal'),
  ('brand', 'pattern',        'Brand Pattern')
) s(category_key, key, label)
  on c.key = s.category_key
on conflict (category_id, key) do nothing;

insert into branding.asset_slots (
  entity_type,
  category_id,
  subcategory_id,
  label_override,
  max_assets,
  is_required
)
select
  'district',
  c.id,
  sc.id,
  'Primary Logo',
  1,
  true
from branding.asset_categories c
join branding.asset_subcategories sc on sc.category_id = c.id
where c.key = 'logo'
  and sc.key = 'primary_logo'
on conflict do nothing;