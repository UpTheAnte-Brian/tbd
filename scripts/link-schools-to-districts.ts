/* scripts/link-schools-to-districts.ts
 *
 * Links school entities to district entities using point-in-polygon (ST_Covers).
 * - school geom: entity_geometries.geometry_type = 'school_program_locations'
 * - district geom: prefer 'boundary_simplified', fallback 'boundary'
 * - relationship: entity_relationships (parent=district, child=school, relationship_type='contains', is_primary=true)
 *
 * Usage:
 *   npm run linkSchoolsToDistricts
 *
 * Optional flags:
 *   --limit=5000
 *   --offset=0
 */

import { createClient } from "@supabase/supabase-js";

function getArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    const hit = process.argv.find((a) => a.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : undefined;
}

const LIMIT = Number(getArg("limit") ?? "1000");
const OFFSET = Number(getArg("offset") ?? "0");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRole) {
    throw new Error(
        "Missing SUPABASE_SERVICE_ROLE_KEY (required for server-side write)",
    );
}

const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false },
});

async function main() {
    console.log("Link schools -> districts");
    console.log({ LIMIT, OFFSET });

    // Call the dedicated DB function to compute + upsert relationships for this batch.
    // NOTE: This assumes the DB function performs the PostGIS matching and handles
    // upsert semantics for (child_entity_id, relationship_type) where is_primary.
    const { data, error } = await supabase.rpc("link_schools_to_districts", {
        p_limit: LIMIT,
        p_offset: OFFSET,
    });

    if (error) throw error;

    // The function can return anything helpful (e.g., rows_processed, rows_upserted).
    // We just log what we got back.
    console.log("link_schools_to_districts result:", data);
    console.log("Done.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
