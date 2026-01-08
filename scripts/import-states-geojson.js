import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

/**
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-states-geojson.js /path/to/us_states_2023.geojson
 *
 * Notes:
 * - Requires the SQL function `public.upsert_entity_geometry_from_geojson` to exist.
 * - Upserts entities by (entity_type='state', slug), where slug = lowercase USPS code.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL; // TODO: remove SUPABASE_URL fallback after migration
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL (preferred) or SUPABASE_URL, and/or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/import-states-geojson.js /path/to/us_states_2023.geojson");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Try common property names from Census/various sources */
function pick(props, keys) {
  for (const k of keys) {
    const v = props?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

/**
 * Some KML->GeoJSON conversions store attributes inside an HTML table string in `properties.description`.
 * Example: ...<th>STUSPS</th><td>AL</td>...
 */
function pickFromDescription(props, key) {
  const desc = props?.description;
  if (!desc || typeof desc !== "string") return null;

  // Match both escaped and unescaped forms.
  // Handles patterns like: <th>STUSPS</th><td>AL</td>
  // and also: <th>STUSPS</th>\n<td>AL</td>
  const re = new RegExp(`(?:<th>\\s*${key}\\s*<\\/th>\\s*<td>)([^<]+)(?:<\\/td>)`, "i");
  const m = desc.match(re);
  if (!m) return null;
  const v = String(m[1]).trim();
  return v.length ? v : null;
}

function normSlug(usps) {
  return String(usps).trim().toLowerCase();
}

function toExternalIds(props) {
  const usps =
    pick(props, ["STUSPS", "USPS", "STATE_ABBR", "STATE", "abbr", "Abbr"]) ??
    pickFromDescription(props, "STUSPS") ??
    pickFromDescription(props, "USPS");

  const fips =
    pick(props, ["STATEFP", "FIPS", "STATE_FIPS", "STATEFP00", "STATEFP10"]) ??
    pickFromDescription(props, "STATEFP") ??
    pickFromDescription(props, "FIPS");

  const geoid =
    pick(props, ["GEOID", "GEOIDFP", "GEOID10", "GEOID20"]) ??
    pickFromDescription(props, "GEOID") ??
    pickFromDescription(props, "GEOIDFP");

  return {
    ...(usps ? { usps: String(usps).trim() } : {}),
    ...(fips ? { fips: String(fips).trim().padStart(2, "0") } : {}),
    ...(geoid ? { geoid: String(geoid).trim() } : {}),
  };
}

async function main() {
  const raw = await fs.readFile(inputPath, "utf8");
  const geojson = JSON.parse(raw);

  if (geojson?.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
    throw new Error("Input is not a valid FeatureCollection");
  }

  const sourceLabel = path.basename(inputPath);

  // Optional: filter out territories if present
  // (You can expand this list depending on your file.)
  const excludedUSPS = new Set(["PR", "GU", "VI", "MP", "AS"]);

  let ok = 0;
  let skipped = 0;

  for (const [i, feature] of geojson.features.entries()) {
    const props = feature?.properties ?? {};
    const geom = feature?.geometry;

    if (!geom) {
      console.warn(`[${i}] missing geometry, skipping`);
      skipped++;
      continue;
    }

    const name = pick(props, ["NAME", "State_Name", "STATE_NAME", "name", "Name"]) ?? null;
    const usps =
      pick(props, ["STUSPS", "USPS", "STATE_ABBR", "abbr", "Abbr"]) ??
      pickFromDescription(props, "STUSPS") ??
      pickFromDescription(props, "USPS") ??
      null;

    if (!name || !usps) {
      console.warn(
        `[${i}] missing NAME/USPS props; got name=${String(name)} usps=${String(usps)}. Skipping.`
      );
      skipped++;
      continue;
    }

    if (excludedUSPS.has(String(usps).trim().toUpperCase())) {
      skipped++;
      continue;
    }

    const slug = normSlug(usps);
    const external_ids = toExternalIds(props);

    // 1) Upsert the entity
    const { data: entityRow, error: entityErr } = await supabase
      .from("entities")
      .upsert(
        {
          entity_type: "state",
          name: String(name).trim(),
          slug,
          external_ids,
        },
        { onConflict: "entity_type,slug" }
      )
      .select("id, entity_type, name, slug")
      .single();

    if (entityErr) {
      console.error(`[${i}] entity upsert failed for ${name} (${usps}):`, entityErr);
      process.exit(1);
    }

    const entity_id = entityRow.id;

    // 2) Upsert geometry + simplified geometry inside DB
    // For a US-wide "click target" layer, we can simplify aggressively.
    const { error: geomErr } = await supabase.rpc("upsert_entity_geometry_from_geojson", {
      p_entity_id: entity_id,
      p_geometry_type: "boundary",
      p_source: sourceLabel,
      p_geojson: geom, // IMPORTANT: geometry object, not the full feature
      p_simplify: true,
      p_simplified_type: "boundary_simplified",
      p_tolerance: 0.05,
    });

    if (geomErr) {
      console.error(`[${i}] geometry upsert failed for ${name} (${usps}) entity=${entity_id}:`, geomErr);
      process.exit(1);
    }

    ok++;
    if (ok % 10 === 0) {
      console.log(`Imported ${ok} states...`);
    }
  }

  console.log(`✅ Done. Imported: ${ok}, skipped: ${skipped}`);
  console.log(`Tip: If you expected exactly 50, check for territories or missing USPS codes in the source file.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
