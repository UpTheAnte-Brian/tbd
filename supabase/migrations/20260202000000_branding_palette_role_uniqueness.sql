-- Enforce one palette per role per entity and normalize roles.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = 'branding'
  ) THEN
    RAISE NOTICE 'Skipping 20260202000000_branding_palette_role_uniqueness: schema "branding" does not exist.';
    RETURN;
  END IF;

  IF to_regclass('branding.palettes') IS NULL THEN
    RAISE NOTICE 'Skipping 20260202000000_branding_palette_role_uniqueness: table "branding.palettes" does not exist.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'branding'
      AND table_name = 'palettes'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE branding.palettes
      ADD COLUMN role text;

    UPDATE branding.palettes
      SET role = CASE
        WHEN lower(name) LIKE '%primary%' THEN 'primary'
        WHEN lower(name) LIKE '%secondary%' THEN 'secondary'
        WHEN lower(name) LIKE '%accent%' THEN 'accent'
        ELSE 'secondary'
      END;

    ALTER TABLE branding.palettes
      ALTER COLUMN role SET NOT NULL;
  END IF;

  WITH ranked AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY entity_id, role
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
      ) AS rn
    FROM branding.palettes
  )
  DELETE FROM branding.palettes p
  USING ranked r
  WHERE p.id = r.id
    AND r.rn > 1;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'branding_palettes_role_check'
  ) THEN
    ALTER TABLE branding.palettes
      ADD CONSTRAINT branding_palettes_role_check
      CHECK (role IN ('primary', 'secondary', 'accent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'branding_palettes_entity_role_unique'
  ) THEN
    ALTER TABLE branding.palettes
      ADD CONSTRAINT branding_palettes_entity_role_unique
      UNIQUE (entity_id, role);
  END IF;
END $$;
