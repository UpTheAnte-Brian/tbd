/* scripts/link-schools-to-districts.ts
 *
 * Runs relationship-defining jobs (RPCs) that upsert rows into public.entity_relationships.
 * - school geom: entity_geometries.geometry_type = 'school_program_locations'
 * - district geom: 'boundary'
 * - relationship: entity_relationships (parent=district, child=school, relationship_type='contains', is_primary=true)
 *
 * Tasks:
 *  - schools_to_districts (default): calls RPC link_schools_to_districts
 *
 * Usage:
 *   npm run linkRelationships -- --task=schools_to_districts --limit=5000 --offset=0
 */

import { createClient } from "@supabase/supabase-js";

function getArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    const hit = process.argv.find((a) => a.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : undefined;
}

const LIMIT = Number(getArg("limit") ?? "1000");
const OFFSET = Number(getArg("offset") ?? "0");
const TASK = (getArg("task") ?? "schools_to_districts").trim();

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
    console.log("Define entity relationships");
    console.log({ TASK, LIMIT, OFFSET });

    const rpcByTask: Record<string, string> = {
        schools_to_districts: "link_schools_to_districts",
    };

    const rpc = rpcByTask[TASK];
    if (!rpc) {
        console.error(
            `Unknown --task=${TASK}. Valid tasks: ${
                Object.keys(rpcByTask).join(", ")
            }`,
        );
        process.exit(1);
    }

    const { data, error } = await supabase.rpc(rpc, {
        p_limit: LIMIT,
        p_offset: OFFSET,
    });

    if (error) throw error;

    console.log(`${rpc} result:`, data);
    console.log("Done.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
