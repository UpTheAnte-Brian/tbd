-- Allow additional narrative sections used by TEOS/990 parsing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'irs'
      AND t.typname = 'irs_narrative_section'
      AND e.enumlabel = 'mission'
  ) THEN
    ALTER TYPE irs.irs_narrative_section ADD VALUE 'mission';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'irs'
      AND t.typname = 'irs_narrative_section'
      AND e.enumlabel = 'program_accomplishments'
  ) THEN
    ALTER TYPE irs.irs_narrative_section ADD VALUE 'program_accomplishments';
  END IF;
END
$$;