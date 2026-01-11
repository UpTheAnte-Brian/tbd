-- Copy district asset slot definitions to business + nonprofit.
-- NOTE: In fresh environments (e.g., Supabase shadow DB used by `supabase db diff`), the `branding`
-- schema and/or `branding.asset_slots` table may not exist yet. If absent, skip this migration.

DO $$
DECLARE
  target_type text;
BEGIN
  -- Guard: branding schema must exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'branding'
  ) THEN
    RAISE NOTICE 'Skipping 20260102000000_seed_brand_asset_slots_non_district: schema "branding" does not exist.';
    RETURN;
  END IF;

  -- Guard: branding.asset_slots table must exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'branding'
      AND table_name = 'asset_slots'
  ) THEN
    RAISE NOTICE 'Skipping 20260102000000_seed_brand_asset_slots_non_district: table "branding.asset_slots" does not exist.';
    RETURN;
  END IF;

  FOREACH target_type IN ARRAY ARRAY['business','nonprofit'] LOOP
    INSERT INTO branding.asset_slots (
      entity_type,
      category_id,
      subcategory_id,
      label_override,
      help_text,
      sort_order,
      is_required,
      max_assets,
      allowed_mime_types,
      active
    )
    SELECT
      target_type,
      s.category_id,
      s.subcategory_id,
      s.label_override,
      s.help_text,
      s.sort_order,
      s.is_required,
      s.max_assets,
      s.allowed_mime_types,
      s.active
    FROM branding.asset_slots s
    WHERE s.entity_type = 'district'
      AND NOT EXISTS (
        SELECT 1
        FROM branding.asset_slots existing
        WHERE existing.entity_type = target_type
          AND existing.category_id = s.category_id
          AND (
            (existing.subcategory_id IS NULL AND s.subcategory_id IS NULL)
            OR existing.subcategory_id = s.subcategory_id
          )
      );
  END LOOP;
END $$;
