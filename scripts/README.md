# Scripts

This folder contains one-off and repeatable scripts used to:
- import/reference external geospatial datasets (districts, attendance areas, schools, states)
- maintain Supabase schemas / RLS rebuild helpers
- run batch backfills (e.g., linking schools → districts)
- support local/dev/test workflows

## Folder layout

- `scripts/*.ts`
  - Executable TypeScript scripts (run via `tsx` and `dotenv`).
- `scripts/geojson/**`
  - Dataset artifacts (raw inputs + derived display outputs) grouped by dataset key + version.
  - Each dataset folder should include:
    - `input.geojson` (raw or canonical)
    - `display.geojson` (render-optimized for UI)
    - `metadata.json` (dataset_key, dataset_version, source_tag, urls, timestamps, etc.)
- `scripts/enrich-role/**`
  - Special-purpose script project (has its own `deno.json`, etc.).
- `scripts/rls/**`
  - SQL helpers for local/dev resets or rebuilding grants.

## Environment + flags

Most scripts support:
- **Environment selection** via `dotenv -e .env.local` / `.env.test.local` etc.
- **Flags** (typical patterns):
  - `--generate-only` (download/convert/prepare but don’t write to DB)
  - `--limit` / `--offset` (batch processing)
  - dataset/version flags depending on script

Recommended env files:
- `.env.local` (dev/local runtime)
- `.env.test.local` (test project)
- `.env.example` (documented keys only)

### Required env vars (typical)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (if a script uses anon)
- `SUPABASE_SERVICE_ROLE_KEY` (for admin/batch scripts)
- any dataset-specific vars (rare)

## Scripts (high level)

### Geospatial imports

#### `import-us-states.ts`
Imports US state entities and geometry (usually TIGER source).  
Output stored in `public.entities` + `public.entity_geometries`.

Typical:
- downloads/unzips (if applicable)
- converts to GeoJSON
- creates `display.geojson` (render-optimized)
- upserts entities + geometries

#### `import-mn-district-boundaries.ts`
Imports MN district boundaries used by UI.

Notes:
- geometry types used:
  - `boundary`

#### `import-mn-attendance-areas.ts`
Imports attendance area polygons tied to district context.

Notes:
- geometry types used:
  - `district_attendance_areas`

#### `import-mn-school-program-locs.ts`
Imports school “program location” points (school entities + point geometries).

Notes:
- geometry types used:
  - `school_program_locations`

### Relationship/backfill scripts

#### `link-schools-to-districts.ts`
Batch-links school entities to:
- the **primary district** that contains the school point
- the **state** that contains the school point (MN, for now)

This script calls the DB function:
- `public.link_schools_to_districts(p_limit int, p_offset int)` via `supabase.rpc(...)`

Example runs:
- `npm run linkSchoolsToDistricts -- --limit=1000 --offset=0`
- `npm run linkSchoolsToDistricts -- --limit=1000 --offset=1000`
- `npm run linkSchoolsToDistricts -- --limit=1000 --offset=2000`

What it should produce:
- `entity_relationships` rows with `relationship_type='contains'`
- district link has `is_primary=true` (one per school)
- state link has `is_primary=false` (optional but expected for MN rollout)

### Utilities

#### `check-env.ts`
Sanity-check environment variables for missing/empty values.

#### `clear-logos.ts`
Administrative cleanup for branding/logo assets.

#### `structure-diff.ts`
Compares schema or file structure snapshots (used during refactors).

#### `migrate-dev-to-test.sh`
Convenience helper for syncing dev → test workflows (use carefully).

## Dataset metadata standard

Each dataset folder under `scripts/geojson/<dataset_key>/<version>/metadata.json` should include:

- `dataset_key`
- `dataset_version`
- `source_tag` (string used in DB `entity_geometries.source`)
- `zip_url` or `source_url` (if applicable)
- `generated_at`
- `output_geojson` (relative path to `input.geojson` or `display.geojson`)

The UI should treat `source_tag` + version as “what you are looking at”.

## Add a new script checklist

1. Put it in `scripts/` with a descriptive name.
2. Add CLI flags:
   - `--generate-only` if it can run without DB writes
   - `--limit/--offset` if it processes rows in batches
3. Write dataset artifacts to `scripts/geojson/<dataset>/<version>/...`
4. If it writes to DB:
   - prefer a **DB function** for set-based work
   - script should only orchestrate batching + logging + retries
5. Update this README with:
   - what it does
   - how to run it
   - what tables/geometry_types it touches

## Notes / gotchas

- Keep batch sizes conservative when doing `.in(...)` queries or large geometry payloads.
- Prefer `entity_geometries_geojson` for UI/API responses, and `entity_geometries.geom` for spatial operations.
- Relationship semantics currently assume:
  - `relationship_type = 'contains'` for hierarchical “parent contains child”
  - `is_primary` used to identify the “main” parent for a given child + relationship
