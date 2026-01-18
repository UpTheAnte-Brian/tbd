/**
 * import-mn-school-program-locs.ts
 *
 * End-to-end pipeline for MN MDE "School Program Locations" (point locations):
 *  1) Download shapefile ZIP and convert to GeoJSON (EPSG:4326)
 *  2) Upsert School entities (entity_type = "school") keyed by deterministic UUID derived from MDE orgid
 *  3) Upsert curated MDE attributes into public.entity_attributes (namespace = "mde")
 *  4) Store full source payload into public.entity_source_records (source = source_tag)
 *  5) Upsert point geometry into public.entity_geometries via RPC upsert_entity_geometry_with_geom_geojson
 *
 * Why:
 *  - Attendance areas reference schools by orgid (elem_orgid / midd_orgid / high_orgid)
 *  - This dataset provides authoritative point locations + names for those orgids
 *
 * Prereqs:
 *  - curl, unzip, ogr2ogr on PATH
 *  - Env vars:
 *      NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *      SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *  - Generate only:
 *      npm run importSchoolProgramLocs -- --generate-only
 *  - Upload only:
 *      npm run importSchoolProgramLocs -- --upload-only --concurrency=8
 *  - Full run:
 *      npm run importSchoolProgramLocs -- --concurrency=8 --version=SY2025_26
 *
 * Source + versioning:
 * - URL: https://resources.gisdata.mn.gov/pub/gdrs/data/pub/us_mn_state_mde/struc_school_program_locs/shp_struc_school_program_locs.zip
 * - source_tag: `${DATASET_KEY}_${versionTag}`
 * - version_tag: defaults to SY2025_26; override with --version=SY2025_26
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

// -----------------------------
// Config
// -----------------------------

const PROJECT_ROOT = process.cwd();

const ZIP_URL =
    "https://resources.gisdata.mn.gov/pub/gdrs/data/pub/us_mn_state_mde/struc_school_program_locs/shp_struc_school_program_locs.zip";

// Keep artifacts committed for debug/repeatability.
// Folder convention: scripts/geojson/<dataset>/<version>/
const DATASET_KEY = "mn_mde_struc_school_program_locs";
const DEFAULT_VERSION = "SY2025_26";
const GEOMETRY_TYPE = "school_program_locations";
function artifactPaths(versionTag: string) {
    const dir = path.join(
        PROJECT_ROOT,
        "scripts/geojson",
        DATASET_KEY,
        versionTag,
    );
    return {
        dir,
        inputGeoJSON: path.join(dir, "input.geojson"),
        displayGeoJSON: path.join(dir, "display.geojson"),
        metadataJSON: path.join(dir, "metadata.json"),
    };
}

function sourceTag(versionTag: string) {
    return `${DATASET_KEY}_${versionTag}`;
}

// Namespace UUID (v5). Any stable UUID string is fine.
// This makes entity IDs deterministic across environments (dev/test/prod)
// as long as the orgid is the same.
const UUID_NAMESPACE = "b5f9f9f0-3d2b-4a55-86a9-1c3df1a11f9a";

type AnyJson = Record<string, unknown>;

type GeoJSONFeature = {
    type: "Feature";
    geometry: { type: string; coordinates: any } | null;
    properties: Record<string, any>;
};

type GeoJSONFC = {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
};

function ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function assertFileExists(filePath: string) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Expected file not found: ${filePath}`);
    }
}

function parseArgs(argv: string[]) {
    const flags = new Set<string>();
    const kv: Record<string, string> = {};

    for (const a of argv) {
        if (a.startsWith("--")) {
            const [k, v] = a.split("=");
            if (v === undefined) flags.add(k);
            else kv[k] = v;
        }
    }

    const concurrency = Number(kv["--concurrency"] ?? "8");
    if (!Number.isFinite(concurrency) || concurrency <= 0) {
        throw new Error(`Invalid --concurrency: ${kv["--concurrency"]}`);
    }

    return {
        generateOnly: flags.has("--generate-only"),
        uploadOnly: flags.has("--upload-only"),
        concurrency,
        versionTag: kv["--version"]?.trim() || DEFAULT_VERSION,
    };
}

function getSupabaseEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.SUPABASE_URL;
    const servicekey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
    }
    if (!servicekey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    return { url, servicekey };
}

// -----------------------------
// UUID v5 (minimal implementation)
// -----------------------------

function uuidToBytes(uuid: string) {
    const hex = uuid.replace(/-/g, "");
    if (hex.length !== 32) throw new Error(`Invalid UUID: ${uuid}`);
    return Buffer.from(hex, "hex");
}

function bytesToUuid(buf: Buffer) {
    const hex = buf.toString("hex");
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
    ].join("-");
}

function uuidv5(name: string, namespaceUuid: string) {
    const ns = uuidToBytes(namespaceUuid);
    const nameBytes = Buffer.from(name, "utf8");

    const hash = crypto.createHash("sha1").update(ns).update(nameBytes)
        .digest();
    const bytes = Buffer.from(hash.slice(0, 16));

    // Set version 5
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    // Set RFC4122 variant
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return bytesToUuid(bytes);
}

// -----------------------------
// Download + convert
// -----------------------------

function downloadAndConvertToGeoJSON(params: {
    inputGeoJSON: string;
    displayGeoJSON: string;
    metadataJSON: string;
    versionTag: string;
    sourceTag: string;
}) {
    const workdir = fs.mkdtempSync(
        path.join(os.tmpdir(), "mn_school_program_locs_"),
    );

    try {
        ensureDir(path.dirname(params.inputGeoJSON));

        const zipPath = path.join(workdir, "school_program_locs.zip");

        console.log(
            "⬇️  Downloading school program locations shapefile ZIP...",
        );
        console.log(`• URL: ${ZIP_URL}`);
        console.log(`• Workdir: ${workdir}`);

        execSync(`curl -L -o "${zipPath}" "${ZIP_URL}"`, { stdio: "inherit" });
        execSync(`unzip -o "${zipPath}" -d "${workdir}"`, { stdio: "inherit" });

        // The ZIP currently contains school_program_locations.shp
        const files = fs.readdirSync(workdir);
        const shpCandidates = files.filter((f) =>
            f.toLowerCase().endsWith(".shp")
        );
        if (shpCandidates.length === 0) {
            throw new Error(`No .shp file found after unzip in: ${workdir}`);
        }
        const preferred = shpCandidates.find((f) =>
            f.toLowerCase().includes("school_program_locations")
        );
        const shpFile = preferred ?? shpCandidates[0];
        const shpPath = path.join(workdir, shpFile);

        console.log("🗺️  Converting shapefile to GeoJSON (EPSG:4326)...");
        console.log(`• Shapefile: ${shpPath}`);
        console.log(`• Output: ${params.inputGeoJSON}`);

        // Generate RFC7946-friendly GeoJSON in WGS84.
        const cmd = [
            "ogr2ogr",
            "-f GeoJSON",
            "-t_srs EPSG:4326",
            `"${params.inputGeoJSON}"`,
            `"${shpPath}"`,
        ].join(" ");

        execSync(cmd, { stdio: "inherit" });

        fs.copyFileSync(params.inputGeoJSON, params.displayGeoJSON);

        // Write lightweight provenance metadata alongside the GeoJSON.
        fs.writeFileSync(
            params.metadataJSON,
            JSON.stringify(
                {
                    dataset_key: DATASET_KEY,
                    dataset_version: params.versionTag,
                    source_tag: params.sourceTag,
                    zip_url: ZIP_URL,
                    generated_at: new Date().toISOString(),
                    output_geojson: path.relative(
                        PROJECT_ROOT,
                        params.inputGeoJSON,
                    ),
                },
                null,
                2,
            ),
            "utf8",
        );

        console.log("✅ Input GeoJSON created.");
    } finally {
        // Always clean up temp unzip dir
        try {
            fs.rmSync(workdir, { recursive: true, force: true });
        } catch {
            // ignore
        }
    }
}

function readGeoJSON(inputGeoJSON: string): GeoJSONFC {
    assertFileExists(inputGeoJSON);
    const raw = fs.readFileSync(inputGeoJSON, "utf8");
    const parsed = JSON.parse(raw) as GeoJSONFC;
    if (
        parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)
    ) {
        throw new Error(
            "Unexpected GeoJSON format; expected FeatureCollection",
        );
    }
    return parsed;
}

// -----------------------------
// Transform helpers
// -----------------------------

function coerceOrgId(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    // orgid sometimes appears as number (float) in GIS exports. Make it an integer string.
    if (typeof value === "number") {
        if (!Number.isFinite(value)) return null;
        return String(Math.trunc(value));
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        // remove trailing .0 if present
        return trimmed.replace(/\.0+$/, "");
    }
    return null;
}

function pickSchoolName(p: Record<string, any>): string {
    return (
        p.gisname ??
            p.mdename ??
            p.altname ??
            p.name ??
            "Unnamed school"
    );
}

function slugify(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 80);
}

function bboxFromPoint(lng: number, lat: number) {
    return { minX: lng, minY: lat, maxX: lng, maxY: lat };
}

function pointFeatureCollection(
    lng: number,
    lat: number,
    properties: Record<string, any> = {},
): GeoJSONFC {
    return {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: { type: "Point", coordinates: [lng, lat] },
                properties,
            },
        ],
    };
}

function stripNullish(obj: Record<string, any>) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined) continue;
        if (typeof v === "string" && v.trim() === "") continue;
        out[k] = v;
    }
    return out;
}

function curatedMdeAttrs(p: Record<string, any>, source: string) {
    // Keep only attributes we expect to use in the app UI/search.
    // Raw payload is preserved separately in entity_source_records.
    return stripNullish({
        source,
        // Names
        gisname: p.gisname ?? null,
        mdename: p.mdename ?? null,
        altname: p.altname ?? null,

        // Classification / flags
        class: p.class ?? null,
        pubpriv: p.pubpriv ?? null,
        loctype: p.loctype ?? null,
        magnet: p.magnet ?? null,
        graderange: p.graderange ?? null,

        // District linkage (kept as attributes for now; can be promoted to entity_relationships later)
        locdistid: coerceOrgId(p.locdistid) ?? null,
        locdistname: p.locdistname ?? null,

        // Address / location-ish
        gisaddr: p.gisaddr ?? null,
        mdeaddr: p.mdeaddr ?? null,
        countycode: p.countycode ?? null,
        countyname: p.countyname ?? null,

        // Other identifiers that are often useful in UI/debugging
        formid: p.formid ?? null,
        fed_schnum: p.fed_schnum ?? null,

        // Source timestamps / version
        createdt: p.createdt ?? null,
        updatedt: p.updatedt ?? null,
        year: p.year ?? null,

        // Links
        web_url: p.web_url ?? null,
    });
}

// -----------------------------
// DB ops
// -----------------------------

async function upsertSchoolEntities(
    supabase: ReturnType<typeof createClient>,
    features: GeoJSONFeature[],
    source: string,
) {
    // Deduplicate by orgid
    const byOrgId = new Map<string, GeoJSONFeature>();
    for (const f of features) {
        const orgid = coerceOrgId(f.properties?.orgid);
        if (!orgid) continue;
        if (!byOrgId.has(orgid)) byOrgId.set(orgid, f);
    }

    const rows = Array.from(byOrgId.entries()).map(([orgid, f]) => {
        const name = pickSchoolName(f.properties ?? {});
        const id = uuidv5(`mde_orgid:${orgid}`, UUID_NAMESPACE);
        const slug = `${slugify(name)}-${orgid}`;

        // Store external IDs in a lightweight JSON blob. If your entities table
        // doesn't have metadata/external_ids, remove this field.
        const external_ids = {
            mde_orgid: orgid,
            orgtype: f.properties?.orgtype ?? null,
            orgnumber: f.properties?.orgnumber ?? null,
            schnumber: f.properties?.schnumber ?? null,
            source,
        };

        return {
            id,
            name,
            slug,
            external_ids,
        };
    });

    console.log(`🏫 Schools found (unique orgid): ${rows.length}`);

    if (rows.length === 0) {
        console.log("⚠️  No valid schools found to upsert.");
        return { idByOrgId: new Map<string, string>() };
    }

    // Upsert in chunks
    const idByOrgId = new Map<string, string>();
    for (const r of rows) {
        const orgid = String((r.external_ids as any).mde_orgid);
        idByOrgId.set(orgid, r.id);
    }

    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        const { error: upsertError } = await supabase
            .from("entities")
            .upsert(
                chunk.map((r) => ({ ...r, entity_type: "school" })) as any,
                { onConflict: "id" },
            );

        if (upsertError) {
            console.warn(
                `⚠️ entities upsert failed (entity_type): ${upsertError.message}`,
            );
            console.error("❌ All entity upsert attempts failed. First row:");
            console.error(JSON.stringify(chunk[0], null, 2));
            throw upsertError;
        }

        console.log(
            `✅ Upserted entities: ${
                Math.min(i + chunkSize, rows.length)
            }/${rows.length}`,
        );
    }

    return { idByOrgId };
}

async function upsertSchoolAttributesAndSourceRecords(
    supabase: ReturnType<typeof createClient>,
    features: GeoJSONFeature[],
    idByOrgId: Map<string, string>,
    source: string,
) {
    // Deduplicate by orgid
    const byOrgId = new Map<string, GeoJSONFeature>();
    for (const f of features) {
        const orgid = coerceOrgId(f.properties?.orgid);
        if (!orgid) continue;
        if (!byOrgId.has(orgid)) byOrgId.set(orgid, f);
    }

    const attrRows: Array<
        { entity_id: string; namespace: string; attrs: AnyJson }
    > = [];
    const sourceRows: Array<
        {
            entity_id: string;
            source: string;
            external_key: string;
            payload: AnyJson;
        }
    > = [];

    for (const [orgid, f] of byOrgId.entries()) {
        const entityId = idByOrgId.get(orgid);
        if (!entityId) continue;

        const props = (f.properties ?? {}) as Record<string, any>;

        // Curated attributes (shared table)
        attrRows.push({
            entity_id: entityId,
            namespace: "mde",
            attrs: curatedMdeAttrs(props, source),
        });

        // Full raw payload for future remapping/debugging
        sourceRows.push({
            entity_id: entityId,
            source,
            external_key: orgid,
            payload: props as AnyJson,
        });
    }

    console.log(`🧾 Attributes queued: ${attrRows.length}`);
    console.log(`🗃️  Source records queued: ${sourceRows.length}`);

    const chunkSize = 500;

    for (let i = 0; i < attrRows.length; i += chunkSize) {
        const chunk = attrRows.slice(i, i + chunkSize);
        const { error } = await supabase
            .from("entity_attributes")
            .upsert(chunk as any, { onConflict: "entity_id,namespace" });
        if (error) {
            console.error("❌ entity_attributes upsert failed. First row:");
            console.error(JSON.stringify(chunk[0], null, 2));
            throw error;
        }
        console.log(
            `✅ Upserted entity_attributes: ${
                Math.min(i + chunkSize, attrRows.length)
            }/${attrRows.length}`,
        );
    }

    for (let i = 0; i < sourceRows.length; i += chunkSize) {
        const chunk = sourceRows.slice(i, i + chunkSize);
        const { error } = await supabase
            .from("entity_source_records")
            .upsert(chunk as any, { onConflict: "entity_id,source" });
        if (error) {
            console.error("❌ entity_source_records upsert failed. First row:");
            console.error(JSON.stringify(chunk[0], null, 2));
            throw error;
        }
        console.log(
            `✅ Upserted entity_source_records: ${
                Math.min(i + chunkSize, sourceRows.length)
            }/${sourceRows.length}`,
        );
    }
}

async function upsertSchoolGeometries(
    supabase: ReturnType<typeof createClient>,
    features: GeoJSONFeature[],
    idByOrgId: Map<string, string>,
    concurrency: number,
    source: string,
) {
    console.log("Using geometry_type:", GEOMETRY_TYPE);

    // Build tasks
    const tasks: Array<() => Promise<void>> = [];

    for (const f of features) {
        const orgid = coerceOrgId(f.properties?.orgid);
        if (!orgid) continue;

        const entityId = idByOrgId.get(orgid);
        if (!entityId) continue;

        const geom = f.geometry;
        if (
            !geom || geom.type !== "Point" ||
            !Array.isArray(geom.coordinates) || geom.coordinates.length < 2
        ) continue;

        const lng = Number(geom.coordinates[0]);
        const lat = Number(geom.coordinates[1]);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;

        const bbox = bboxFromPoint(lng, lat);

        // p_geojson is for rendering (FeatureCollection)
        const fc = pointFeatureCollection(lng, lat, {
            orgid,
            name: pickSchoolName(f.properties ?? {}),
        });

        // p_geom_geojson should be a GeoJSON Geometry object (not a FeatureCollection)
        const pointGeom = { type: "Point", coordinates: [lng, lat] };

        tasks.push(async () => {
            const payload = {
                p_entity_id: entityId,
                p_geometry_type: GEOMETRY_TYPE,
                p_geojson: fc,
                p_geom_geojson: pointGeom,
                p_bbox: bbox,
                p_source: source,
            };

            const { error } = await supabase.rpc(
                "upsert_entity_geometry_with_geom_geojson",
                payload as any,
            );

            if (error) {
                console.error("❌ Geometry upsert failed", {
                    orgid,
                    entityId,
                    lng,
                    lat,
                    message: error.message,
                    details: (error as any).details,
                    hint: (error as any).hint,
                    code: (error as any).code,
                });
                throw error;
            }
        });
    }

    console.log(`📍 School geometry upserts queued: ${tasks.length}`);

    // Simple concurrency pool
    let done = 0;
    let idx = 0;

    async function worker() {
        while (true) {
            const myIdx = idx++;
            if (myIdx >= tasks.length) return;
            await tasks[myIdx]();
            done++;
            if (done % 250 === 0 || done === tasks.length) {
                console.log(`✅ Geometries upserted: ${done}/${tasks.length}`);
            }
        }
    }

    const workers = Array.from({
        length: Math.max(1, Math.min(concurrency, tasks.length)),
    }, () => worker());
    await Promise.all(workers);

    console.log("✅ School program location geometries upsert complete.");
}

// -----------------------------
// Main
// -----------------------------

async function main() {
    const { generateOnly, uploadOnly, concurrency, versionTag } = parseArgs(
        process.argv.slice(2),
    );
    const paths = artifactPaths(versionTag);
    const source = sourceTag(versionTag);

    ensureDir(paths.dir);
    console.log("Dataset info:");
    console.log(`• source_url: ${ZIP_URL}`);
    console.log(`• source_tag: ${source}`);
    console.log(`• version_tag: ${versionTag}`);
    console.log(`• input_geojson: ${paths.inputGeoJSON}`);
    console.log(`• display_geojson: ${paths.displayGeoJSON}`);

    if (!uploadOnly) {
        downloadAndConvertToGeoJSON({
            inputGeoJSON: paths.inputGeoJSON,
            displayGeoJSON: paths.displayGeoJSON,
            metadataJSON: paths.metadataJSON,
            versionTag,
            sourceTag: source,
        });
    } else {
        console.log(
            "↪️  --upload-only specified; skipping download/conversion.",
        );
    }

    if (generateOnly) {
        console.log(
            "✅ --generate-only specified; stopping after file generation.",
        );
        return;
    }

    // Upload path
    assertFileExists(paths.inputGeoJSON);

    const fc = readGeoJSON(paths.inputGeoJSON);
    console.log(`• Features in file: ${fc.features.length}`);

    const { url, servicekey } = getSupabaseEnv();
    const supabase = createClient(url, servicekey, {
        auth: { persistSession: false },
    });

    // 1) Upsert entities
    const { idByOrgId } = await upsertSchoolEntities(
        supabase,
        fc.features,
        source,
    );

    // 2) Upsert curated attributes + raw source payload
    await upsertSchoolAttributesAndSourceRecords(
        supabase,
        fc.features,
        idByOrgId,
        source,
    );

    // 3) Upsert geometries
    await upsertSchoolGeometries(
        supabase,
        fc.features,
        idByOrgId,
        concurrency,
        source,
    );

    console.log("🎉 Done.");
}

main().catch((err) => {
    console.error("\n❌ Import failed:");
    console.error(err);
    process.exit(1);
});
