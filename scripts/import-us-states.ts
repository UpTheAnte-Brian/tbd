import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import crypto from "node:crypto";

const execFileAsync = promisify(execFile);

/**
 * Usage:
 *   dotenv -e .env.local -- tsx scripts/import-us-states.ts [--generate-only|--upload-only] [--vintage=TIGER2023] [--tolerance=0.05]
 *
 * Notes:
 * - Requires SQL function `public.upsert_entity_geometry_from_geojson`.
 * - Upserts entities by (entity_type='state', slug), where slug = lowercase USPS code.
 * - Imports States + DC only (excludes PR, GU, VI, MP, AS).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
        "Missing env vars: NEXT_PUBLIC_SUPABASE_URL (preferred) or SUPABASE_URL, and/or SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
}

type Args = {
    generateOnly: boolean;
    uploadOnly: boolean;
    vintage: string;
    tolerance: number;
};

function parseArgs(argv: string[]): Args {
    const out: Args = {
        generateOnly: false,
        uploadOnly: false,
        vintage: "TIGER2023",
        tolerance: 0.05,
    };

    for (const a of argv) {
        if (a === "--generate-only") out.generateOnly = true;
        else if (a === "--upload-only") out.uploadOnly = true;
        else if (a.startsWith("--vintage=")) {
            out.vintage = a.split("=")[1] || out.vintage;
        } else if (a.startsWith("--tolerance=")) {
            const n = Number(a.split("=")[1]);
            if (!Number.isNaN(n)) out.tolerance = n;
        }
    }

    if (out.generateOnly && out.uploadOnly) {
        throw new Error(
            "Cannot use --generate-only and --upload-only together",
        );
    }

    return out;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

const TIGER_ZIP_URL =
    "https://www2.census.gov/geo/tiger/TIGER2023/STATE/tl_2023_us_state.zip";
const DATASET_DIR = "us_census_tiger_us_state";
const SOURCE_TAG_PREFIX = "us_census_tiger_state_2023";

function repoGeojsonDir(vintage: string) {
    return path.join(process.cwd(), "scripts", "geojson", DATASET_DIR, vintage);
}

async function ensureDir(p: string) {
    await fs.mkdir(p, { recursive: true });
}

async function pathExists(p: string) {
    try {
        await fs.stat(p);
        return true;
    } catch {
        return false;
    }
}

async function run(cmd: string, args: string[], cwd?: string) {
    await execFileAsync(cmd, args, { cwd, maxBuffer: 1024 * 1024 * 50 });
}

async function downloadFile(url: string, outPath: string) {
    // Use curl for consistency with your other scripts.
    await run("curl", ["-L", "-o", outPath, url]);
}

async function writeMetadata(params: {
    metadataJSON: string;
    datasetVersion: string;
    sourceTag: string;
    zipUrl: string;
    inputGeoJSON: string;
}) {
    const payload = {
        dataset_key: DATASET_DIR,
        dataset_version: params.datasetVersion,
        source_tag: params.sourceTag,
        zip_url: params.zipUrl,
        generated_at: new Date().toISOString(),
        output_geojson: path.relative(process.cwd(), params.inputGeoJSON),
    };
    await fs.writeFile(params.metadataJSON, JSON.stringify(payload, null, 2));
}

function pick(props: any, keys: string[]) {
    for (const k of keys) {
        const v = props?.[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return null;
}

function pickFromDescription(props: any, key: string) {
    const desc = props?.description;
    if (!desc || typeof desc !== "string") return null;

    const re = new RegExp(
        `(?:<th>\\s*${key}\\s*<\\/th>\\s*<td>)([^<]+)(?:<\\/td>)`,
        "i",
    );
    const m = desc.match(re);
    if (!m) return null;
    const v = String(m[1]).trim();
    return v.length ? v : null;
}

function normSlug(usps: string) {
    return String(usps).trim().toLowerCase();
}

function toExternalIds(props: any) {
    const usps =
        pick(props, [
            "STUSPS",
            "USPS",
            "STATE_ABBR",
            "STATE",
            "abbr",
            "Abbr",
        ]) ??
            pickFromDescription(props, "STUSPS") ??
            pickFromDescription(props, "USPS");

    const fips =
        pick(props, [
            "STATEFP",
            "FIPS",
            "STATE_FIPS",
            "STATEFP00",
            "STATEFP10",
        ]) ??
            pickFromDescription(props, "STATEFP") ??
            pickFromDescription(props, "FIPS");

    const geoid = pick(props, ["GEOID", "GEOIDFP", "GEOID10", "GEOID20"]) ??
        pickFromDescription(props, "GEOID") ??
        pickFromDescription(props, "GEOIDFP");

    return {
        ...(usps ? { usps: String(usps).trim() } : {}),
        ...(fips ? { fips: String(fips).trim().padStart(2, "0") } : {}),
        ...(geoid ? { geoid: String(geoid).trim() } : {}),
    };
}

async function findFirstShp(rootDir: string): Promise<string> {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(rootDir, e.name);
        if (e.isDirectory()) {
            const nested = await findFirstShp(full);
            if (nested) return nested;
        } else if (e.isFile() && e.name.toLowerCase().endsWith(".shp")) {
            return full;
        }
    }
    return "";
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const outDir = repoGeojsonDir(args.vintage);
    await ensureDir(outDir);

    const inputGeojsonPath = path.join(outDir, "input.geojson");
    const displayGeojsonPath = path.join(outDir, "display.geojson");
    const metadataJsonPath = path.join(outDir, "metadata.json");

    // ----- Generate artifacts -----
    if (!args.uploadOnly) {
        const runId = crypto.randomUUID();
        const workDir = path.join(tmpdir(), `us_states_${runId}`);
        await ensureDir(workDir);
        try {
            const zipPath = path.join(workDir, "tl_2023_us_state.zip");
            console.log("⬇️  Downloading TIGER states shapefile ZIP...");
            console.log(`  URL: ${TIGER_ZIP_URL}`);
            await downloadFile(TIGER_ZIP_URL, zipPath);

            console.log("📦 Unzipping...");
            await run("unzip", ["-o", zipPath, "-d", workDir]);

            const shpPath = await findFirstShp(workDir);
            if (!shpPath) {
                throw new Error(
                    `Could not find a .shp file after unzip in ${workDir}`,
                );
            }

            console.log("🗺️  Converting shapefile → GeoJSON (EPSG:4326)...");
            console.log(`  Shapefile: ${shpPath}`);
            await run("ogr2ogr", [
                "-f",
                "GeoJSON",
                "-t_srs",
                "EPSG:4326",
                inputGeojsonPath,
                shpPath,
            ]);

            console.log("✨ Generating display (simplified) GeoJSON...");
            await run("ogr2ogr", [
                "-f",
                "GeoJSON",
                "-t_srs",
                "EPSG:4326",
                "-simplify",
                String(args.tolerance),
                displayGeojsonPath,
                shpPath,
            ]);

            const sourceLabel = `${SOURCE_TAG_PREFIX}_${args.vintage}`;
            await writeMetadata({
                metadataJSON: metadataJsonPath,
                datasetVersion: args.vintage,
                sourceTag: sourceLabel,
                zipUrl: TIGER_ZIP_URL,
                inputGeoJSON: inputGeojsonPath,
            });

            console.log("✅ GeoJSON artifacts created:");
            console.log(`  input:   ${inputGeojsonPath}`);
            console.log(`  display: ${displayGeojsonPath}`);

            if (args.generateOnly) {
                console.log(
                    "--generate-only specified; stopping after file generation.",
                );
                return;
            }
        } finally {
            await fs.rm(workDir, { recursive: true, force: true });
        }
    }

    // ----- Upload -----
    if (!(await pathExists(inputGeojsonPath))) {
        throw new Error(
            `Missing input GeoJSON at ${inputGeojsonPath}. Run without --upload-only first.`,
        );
    }

    const raw = await fs.readFile(inputGeojsonPath, "utf8");
    const fc = JSON.parse(raw);

    if (fc?.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
        throw new Error("Input is not a valid FeatureCollection");
    }

    const sourceLabel = `${SOURCE_TAG_PREFIX}_${args.vintage}`;

    // States + DC only (exclude territories)
    const excludedUSPS = new Set(["PR", "GU", "VI", "MP", "AS"]);

    let ok = 0;
    let skipped = 0;

    for (const [i, feature] of fc.features.entries()) {
        const props = feature?.properties ?? {};
        const geom = feature?.geometry;

        if (!geom) {
            console.warn(`[${i}] missing geometry, skipping`);
            skipped++;
            continue;
        }

        const name = pick(props, [
            "NAME",
            "State_Name",
            "STATE_NAME",
            "name",
            "Name",
        ]);
        const usps =
            pick(props, ["STUSPS", "USPS", "STATE_ABBR", "abbr", "Abbr"]) ??
                pickFromDescription(props, "STUSPS") ??
                pickFromDescription(props, "USPS");

        if (!name || !usps) {
            console.warn(
                `[${i}] missing NAME/USPS props; got name=${
                    String(name)
                } usps=${String(usps)}. Skipping.`,
            );
            skipped++;
            continue;
        }

        const uspsUpper = String(usps).trim().toUpperCase();
        if (excludedUSPS.has(uspsUpper)) {
            skipped++;
            continue;
        }

        const slug = normSlug(uspsUpper); // mn, wi, dc
        const external_ids = toExternalIds(props);

        const { data: entityRow, error: entityErr } = await supabase
            .from("entities")
            .upsert(
                {
                    entity_type: "state",
                    name: String(name).trim(),
                    slug,
                    external_ids,
                },
                { onConflict: "entity_type,slug" },
            )
            .select("id")
            .single();

        if (entityErr) {
            console.error(
                `[${i}] entity upsert failed for ${name} (${uspsUpper}):`,
                entityErr,
            );
            process.exit(1);
        }

        const entity_id = (entityRow as any).id as string;

        const { error: geomErr } = await supabase.rpc(
            "upsert_entity_geometry_from_geojson",
            {
                p_entity_id: entity_id,
                p_geometry_type: "boundary",
                p_source: sourceLabel,
                // IMPORTANT: geometry object, not the full feature
                p_geojson: geom,
                p_simplify: true,
                p_simplified_type: "boundary_simplified",
                p_tolerance: args.tolerance,
            },
        );

        if (geomErr) {
            console.error(
                `[${i}] geometry upsert failed for ${name} (${uspsUpper}) entity=${entity_id}:`,
                geomErr,
            );
            process.exit(1);
        }

        ok++;
        if (ok % 10 === 0) console.log(`Imported ${ok} states...`);
    }

    console.log(`✅ Done. Imported: ${ok}, skipped: ${skipped}`);
    console.log(
        "DC is included as `dc`. Territories are excluded (PR, GU, VI, MP, AS). ",
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
