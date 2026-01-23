import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "../lib/load-env";

const loadedEnv = loadEnvFiles();
if (loadedEnv.length > 0) {
    console.log(`Loaded env: ${loadedEnv.join(", ")}`);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error(
        "Missing env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
});

const MIN_DISTRICT_COUNT = 300;
const MIN_CHILD_FEATURES = 300;

const failures: string[] = [];

function fail(message: string) {
    failures.push(message);
    console.error(`FAIL: ${message}`);
}

function pass(message: string) {
    console.log(`OK: ${message}`);
}

async function main() {
    console.log("Verifying local Supabase invariants...");

    const { data: mn, error: mnError } = await supabase
        .from("entities")
        .select("id, slug, entity_type")
        .eq("slug", "mn")
        .eq("entity_type", "state")
        .maybeSingle();

    if (mnError) {
        fail(`MN lookup failed: ${mnError.message}`);
    } else if (!mn) {
        fail("MN entity missing (slug=mn, entity_type=state)");
    } else {
        pass(`MN entity found (${mn.id})`);
    }

    const { count: districtCount, error: districtError } = await supabase
        .from("entities")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", "district");

    if (districtError) {
        fail(`District count failed: ${districtError.message}`);
    } else if ((districtCount ?? 0) < MIN_DISTRICT_COUNT) {
        fail(
            `District count too low: ${districtCount ?? 0} (<${MIN_DISTRICT_COUNT})`,
        );
    } else {
        pass(`District count OK: ${districtCount}`);
    }

    const { count: nullGeojsonCount, error: geojsonError } = await supabase
        .from("entity_geometries")
        .select("id", { count: "exact", head: true })
        .eq("geometry_type", "boundary")
        .is("geojson", null);

    if (geojsonError) {
        fail(`GeoJSON null check failed: ${geojsonError.message}`);
    } else if ((nullGeojsonCount ?? 0) > 0) {
        fail(
            `boundary has ${nullGeojsonCount} null geojson rows (expected 0)`,
        );
    } else {
        pass("boundary geojson has no nulls");
    }

    if (mn) {
        const { data: relRows, error: relError } = await supabase
            .from("entity_relationships")
            .select("child_entity_id")
            .eq("parent_entity_id", mn.id)
            .eq("relationship_type", "contains");

        if (relError) {
            fail(`Child relationship lookup failed: ${relError.message}`);
        } else {
            const childIds = (relRows ?? [])
                .map((row) => row.child_entity_id)
                .filter((id): id is string => typeof id === "string");

            const { count: childCount, error: childCountError } = await supabase
                .from("entity_geometries")
                .select("entity_id", { count: "exact", head: true })
                .in("entity_id", childIds)
                .eq("geometry_type", "boundary");

            if (childCountError) {
                fail(`Child geometry count failed: ${childCountError.message}`);
            } else if ((childCount ?? 0) <= MIN_CHILD_FEATURES) {
            fail(
                `MN child geometries returned ${childCount ?? 0} features (expected >${MIN_CHILD_FEATURES})`,
            );
            } else {
                pass(`MN child geometries returned ${childCount ?? 0} features`);
            }
        }
    }

    if (failures.length > 0) {
        console.error(`\n${failures.length} invariant(s) failed.`);
        process.exit(1);
    }

    console.log("\nAll local invariants passed.");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
