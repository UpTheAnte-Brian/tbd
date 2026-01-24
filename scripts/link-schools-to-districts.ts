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
 *   npm run linkSchoolsToDistricts:test -- --limit=1000 --offset=0   # loops by default
 *   npm run linkSchoolsToDistricts:test -- --limit=1000 --offset=0 --once            # single batch
 *   npm run linkSchoolsToDistricts:test -- --limit=1000 --offset=0 --stopAfterZeroBatches=3 --sleepMs=50
 */

import { createClient } from "@supabase/supabase-js";

function getArg(name: string): string | undefined {
    // Supports both: --name=value and --name value
    const argv = process.argv;
    const eqPrefix = `--${name}=`;

    const hitEq = argv.find((a) => a.startsWith(eqPrefix));
    if (hitEq) return hitEq.slice(eqPrefix.length);

    const flag = `--${name}`;
    const idx = argv.findIndex((a) => a === flag);
    if (idx >= 0 && idx + 1 < argv.length) {
        const next = argv[idx + 1];
        if (!next.startsWith("--")) return next;
    }

    return undefined;
}

function hasFlag(name: string): boolean {
    return process.argv.includes(`--${name}`);
}

function numArg(name: string, def: number): number {
    const raw = getArg(name);
    if (raw == null) return def;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
        throw new Error(
            `Invalid --${name}=${raw}. Expected a non-negative number.`,
        );
    }
    return n;
}

const LIMIT = numArg("limit", 1000);
const START_OFFSET = numArg("offset", 0);
const TASK = (getArg("task") ?? "schools_to_districts").trim();

// Looping behavior:
// - default: loop through batches automatically
// - pass --once to run a single batch
const RUN_ONCE = hasFlag("once");

// Stop conditions (tunable):
// - stop after N consecutive batches with 0 progress (default 3)
// - optional max batches safety guard (default 10_000)
const STOP_AFTER_ZERO_BATCHES = numArg("stopAfterZeroBatches", 3);
const MAX_BATCHES = numArg("maxBatches", 10_000);

// Optional pause between batches (ms)
const SLEEP_MS = numArg("sleepMs", 0);

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

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractProgress(data: unknown): number {
    // Try to infer how many rows were upserted/inserted from common RPC return shapes.
    if (data == null) return 0;

    if (typeof data === "number") return data;

    if (Array.isArray(data)) return data.length;

    if (typeof data === "object") {
        const obj = data as Record<string, unknown>;
        const candidates = [
            "primary_upserts",
            "upserts",
            "rows_upserted",
            "inserted",
            "inserted_count",
            "updated",
            "count",
        ];
        for (const k of candidates) {
            const v = obj[k];
            if (typeof v === "number" && Number.isFinite(v)) return v;
        }
    }

    return 0;
}

async function main() {
    console.log("Define entity relationships");

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

    let offset = START_OFFSET;
    let zeroProgressStreak = 0;

    // If --once is set, we only execute one batch.
    const batchesToRun = RUN_ONCE ? 1 : MAX_BATCHES;

    for (let batch = 0; batch < batchesToRun; batch++) {
        console.log({ TASK, LIMIT, OFFSET: offset, batch: batch + 1 });

        const { data, error } = await supabase.rpc(rpc, {
            p_limit: LIMIT,
            p_offset: offset,
        });

        if (error) throw error;

        const progress = extractProgress(data);
        console.log(`${rpc} result:`, data);
        console.log(`${rpc} progress:`, progress);

        if (progress <= 0) {
            zeroProgressStreak++;
        } else {
            zeroProgressStreak = 0;
        }

        // Advance to next batch window.
        offset += LIMIT;

        // Stop after a few consecutive zero-progress batches (handles sparse upserts).
        if (!RUN_ONCE && zeroProgressStreak >= STOP_AFTER_ZERO_BATCHES) {
            console.log(
                `Stopping: ${zeroProgressStreak} consecutive batches with 0 progress.`,
            );
            break;
        }

        if (RUN_ONCE) break;

        if (SLEEP_MS > 0) await sleep(SLEEP_MS);
    }

    if (!RUN_ONCE && MAX_BATCHES > 0) {
        console.log("Done.");
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
