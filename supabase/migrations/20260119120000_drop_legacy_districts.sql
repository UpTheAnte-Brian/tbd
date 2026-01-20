-- Drop legacy districts table + dependent columns / constraints
-- Safe to run multiple times (uses IF EXISTS checks)

-- 0) Drop legacy dependent tables that have FKs pointing at public.districts
-- These existed from older experiments and can block dropping districts.
DROP TABLE IF EXISTS public.business_campaigns CASCADE;
DROP TABLE IF EXISTS public.district_signups CASCADE;

-- 1) Drop FKs that reference public.districts (if they still exist)
DO $$
BEGIN
  -- donations.district_id -> districts(id)
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'donations_district_id_fkey'
  ) THEN
    ALTER TABLE public.donations DROP CONSTRAINT donations_district_id_fkey;
  END IF;

  -- subscriptions.district_id -> districts(id)
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_district_id_fkey'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_district_id_fkey;
  END IF;

  -- nonprofits.district_id -> districts(id)
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nonprofits_district_id_fkey'
  ) THEN
    ALTER TABLE public.nonprofits DROP CONSTRAINT nonprofits_district_id_fkey;
  END IF;
END $$;

-- 2) Drop district_id columns (only if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='donations' AND column_name='district_id'
  ) THEN
    ALTER TABLE public.donations DROP COLUMN district_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='district_id'
  ) THEN
    ALTER TABLE public.subscriptions DROP COLUMN district_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nonprofits' AND column_name='district_id'
  ) THEN
    ALTER TABLE public.nonprofits DROP COLUMN district_id;
  END IF;
END $$;

-- 3) Drop dependent views that might reference public.districts (add here if any exist)
-- DROP VIEW IF EXISTS public.some_view;

-- 4) Drop functions that might reference public.districts (add here if you find any)
-- DROP FUNCTION IF EXISTS public.some_function(args);

-- 5) Finally drop the legacy districts table
DROP TABLE IF EXISTS public.districts;
