import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "../lib/load-env";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const supabaseCmd = process.platform === "win32" ? "supabase.cmd" : "supabase";

const loadedEnv = loadEnvFiles([
    ".env.supabase.local.generated",
    ".env.local",
    ".env.development.local",
]);
if (loadedEnv.length > 0) {
    console.log(`Loaded env: ${loadedEnv.join(", ")}`);
}

function applyForcedLocalSupabaseEnv() {
    const generatedEnvPath = path.resolve(
        process.cwd(),
        ".env.supabase.local.generated",
    );
    if (!fs.existsSync(generatedEnvPath)) return;

    const contents = fs.readFileSync(generatedEnvPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (
            key === "NEXT_PUBLIC_SUPABASE_URL" ||
            key === "NEXT_PUBLIC_SUPABASE_ANON_KEY" ||
            key === "SUPABASE_SERVICE_ROLE_KEY" ||
            key === "SUPABASE_URL"
        ) {
            process.env[key] = value;
        }
    }
}

applyForcedLocalSupabaseEnv();

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
    // Prefer live credentials from running local Supabase to avoid stale key mismatches.
    const status = spawnSync(
        supabaseCmd,
        ["status", "--output", "json"],
        { encoding: "utf8", env: process.env },
    );
    let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    let servicekey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!status.error && status.status === 0) {
        const output = `${status.stdout ?? ""}\n${status.stderr ?? ""}`;
        const start = output.indexOf("{");
        const end = output.lastIndexOf("}");
        if (start >= 0 && end > start) {
            try {
                const parsed = JSON.parse(output.slice(start, end + 1)) as {
                    API_URL?: string;
                    SECRET_KEY?: string;
                    SERVICE_ROLE_KEY?: string;
                };
                if (parsed.API_URL) {
                    url = parsed.API_URL;
                    process.env.NEXT_PUBLIC_SUPABASE_URL = parsed.API_URL;
                    process.env.SUPABASE_URL = parsed.API_URL;
                }
                if (parsed.SECRET_KEY) {
                    servicekey = parsed.SECRET_KEY;
                    process.env.SUPABASE_SERVICE_ROLE_KEY = parsed.SECRET_KEY;
                } else if (parsed.SERVICE_ROLE_KEY) {
                    servicekey = parsed.SERVICE_ROLE_KEY;
                    process.env.SUPABASE_SERVICE_ROLE_KEY = parsed.SERVICE_ROLE_KEY;
                }
            } catch {
                // Fallback to env values when JSON parsing fails.
            }
        }
    }

    if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
    if (!servicekey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    const normalized = url.toLowerCase();
    const isLocal = normalized.includes("127.0.0.1") ||
        normalized.includes("localhost");
    if (!isLocal) {
        throw new Error(
            `Refusing to run seed:local against non-local Supabase URL: ${url}`,
        );
    }
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
