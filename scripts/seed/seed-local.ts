import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "../lib/load-env";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const loadedEnv = loadEnvFiles();
if (loadedEnv.length > 0) {
    console.log(`Loaded env: ${loadedEnv.join(", ")}`);
}

type Step = {
    name: string;
    args: string[];
};

const steps: Step[] = [
    { name: "importStates", args: ["run", "importStates"] },
    { name: "importDistricts", args: ["run", "importDistricts"] },
    { name: "importMdeSuperintendents", args: ["run", "importMdeSuperintendents:dev"] },
    { name: "linkMnDistrictsToState:local", args: ["run", "linkMnDistrictsToState:local"] },
    {
        name: "importDistrictBoundaries",
        args: ["run", "importDistrictBoundaries"],
    },
    { name: "importAttendanceAreas", args: ["run", "importAttendanceAreas"] },
    {
        name: "importSchoolProgramLocs",
        args: ["run", "importSchoolProgramLocs"],
    },
    { name: "linkSchoolsToDistricts", args: ["run", "linkSchoolsToDistricts"] },
];

function getSupabaseEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const servicekey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
    if (!servicekey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    return { url, servicekey };
}

async function ensureEntityTypes() {
    const { url, servicekey } = getSupabaseEnv();
    const supabase = createClient(url, servicekey, {
        auth: { persistSession: false },
    });

    const entityTypes = [
        {
            key: "business",
            label: "Business",
            description: "Merchants and employers",
            active: true,
        },
        {
            key: "district",
            label: "District",
            description: "School districts",
            active: true,
        },
        {
            key: "nonprofit",
            label: "Nonprofit",
            description: "District foundations and other charities",
            active: true,
        },
        {
            key: "school",
            label: "School",
            description: "School building/campus entity",
            active: true,
        },
        {
            key: "state",
            label: "State",
            description: "US states + DC",
            active: true,
        },
    ];

    const { error } = await supabase
        .from("entity_types")
        .upsert(entityTypes, { onConflict: "key" });

    if (error) throw error;
    console.log("OK: entity_types baseline ensured");
}

function runStep(step: Step) {
    console.log(`\n==> ${step.name}`);
    const start = performance.now();

    const result = spawnSync(npmCmd, step.args, {
        stdio: "inherit",
        env: process.env,
    });

    const elapsed = ((performance.now() - start) / 1000).toFixed(2);

    if (result.error) {
        console.error(result.error);
        process.exit(1);
    }

    if (result.status !== 0) {
        console.error(`Step failed: ${step.name}`);
        process.exit(result.status ?? 1);
    }

    console.log(`OK: ${step.name} (${elapsed}s)`);
}

async function main() {
    await ensureEntityTypes();
    for (const step of steps) {
        runStep(step);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
