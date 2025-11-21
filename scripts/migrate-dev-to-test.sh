#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# CONFIG – EDIT THESE TWO LINES
###############################################################################

SRC_DB_URL="postgres://postgres:xoESBhhhtD49sZlz@db.ficwwbcophgsttirthxd.supabase.co:5432/postgres?sslmode=require"
TGT_DB_URL="postgres://postgres:yZLHA2ocWQMFaGMY@db.ynuqfzamakmiqzluuhnr.supabase.co:5432/postgres?sslmode=require"

###############################################################################
timestamp="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="dev_public_${timestamp}.dump"

echo
echo "==> Step 1: Dumping DEV public schema to $DUMP_FILE"
pg_dump "$SRC_DB_URL" \
  --schema=public \
  --format=custom \
  --no-owner \
  --no-privileges \
  --no-comments \
  --exclude-table-data=spatial_ref_sys \
  -f "$DUMP_FILE"

echo
echo "==> Step 2: Resetting TEST public schema and re-creating extensions"
psql "$TGT_DB_URL" <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgjwt;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_graphql;
SQL

echo
echo "==> Step 3: Restoring DEV public into TEST (cleaned SQL)"

pg_restore \
  --no-owner \
  --no-privileges \
  -f - \
  "$DUMP_FILE" | \
  sed '/^SET /d' | \
  psql "$TGT_DB_URL"

echo
echo "==> Step 4: Verifying districts table in TEST"
psql "$TGT_DB_URL" -c "SELECT count(*) AS districts_count FROM public.districts;" \
  || echo "⚠️ districts table not found"

echo
echo "✅ Migration complete: $DUMP_FILE"