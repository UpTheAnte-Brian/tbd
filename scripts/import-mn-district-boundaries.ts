/**
 * import-mn-district-boundaries.ts
 *
 * End-to-end pipeline for MN school district boundary geometries:
 *  1) Download MN MDE district boundaries GeoPackage ZIP
 *  2) Convert to GeoJSON (EPSG:4326)
 *  3) Generate a render/display GeoJSON (optional simplify + keep props)
 *  4) Upsert district identity keys into public.entities.external_ids (sdorgid/sdnumber/sdtype/formid)
 *  5) Upsert curated district attributes into public.entity_attributes (namespace = "mde")
 *  6) Store full source payload into public.entity_source_records (source = source_tag)
 *  7) Upload per-district geometries to Supabase via RPC `upsert_entity_geometry_with_geom_geojson`
 *
 * Notes:
 *  - This script assumes district entities already exist (from your district import).
 *    We map geometry features to districts using sdorgid -> entity_id.
 *  - We write versioned GeoJSON artifacts under:
 *      scripts/geojson/mn_mde_bdry_school_district_boundaries/<VERSION_TAG>/
 *
 * Prereqs:
 *  - GDAL installed (ogr2ogr available on PATH) unless using --upload-only
 *  - Env vars (service role):
 *      NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *      SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *  npm run importDistrictBoundaries
 *  npm run importDistrictBoundaries -- --generate-only
 *  npm run importDistrictBoundaries -- --upload-only --concurrency=8
 *
 * Optional flags:
 *  --version=SY2025_26                (defaults to SY2025_26)
 *  --vintage=SY2025_26                (deprecated; alias for --version)
 *  --no-display                       (skip display/simplify generation)
 *  --simplify=0.001                   (display simplify tolerance; defaults 0.001)
 *  --upload-simplified                (also upload geometry_type=boundary_simplified)
 *
 * Download source:
 *  https://resources.gisdata.mn.gov/pub/gdrs/data/pub/us_mn_state_mde/bdry_school_district_boundaries/gpkg_bdry_school_district_boundaries.zip
 *
 * Source + versioning:
 * - URL: https://resources.gisdata.mn.gov/pub/gdrs/data/pub/us_mn_state_mde/bdry_school_district_boundaries/gpkg_bdry_school_district_boundaries.zip
 * - source_tag: `${DATASET_KEY}_${versionTag}`
 * - version_tag: defaults to SY2025_26; override with --version=SY2025_26
 */

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ----------------------------
// Config
// ----------------------------

const DEFAULT_VERSION = "SY2025_26";
const DATASET_KEY = "mn_mde_bdry_school_district_boundaries";
const DOWNLOAD_URL =
    "https://resources.gisdata.mn.gov/pub/gdrs/data/pub/us_mn_state_mde/bdry_school_district_boundaries/gpkg_bdry_school_district_boundaries.zip";

// IMPORTANT: keep in sync with DB check constraint
const GEOMETRY_TYPE_BOUNDARY = "boundary";
const GEOMETRY_TYPE_BOUNDARY_SIMPLIFIED = "boundary_simplified";

// Deterministic UUID namespace (commit this value and never change it)
// If you already have a namespace constant elsewhere, replace this string to match.
const UUID_NAMESPACE = "2f8c8e8a-7f24-4c0a-9d0a-3bd1a7d3a7b1";

// ----------------------------
// CLI args
// ----------------------------

type Args = {
    generateOnly: boolean;
    uploadOnly: boolean;
    noDisplay: boolean;
    uploadSimplified: boolean;
    concurrency: number;
    versionTag: string;
    simplify: number;
};

function parseArgs(argv: string[]): Args {
    const args: Args = {
        generateOnly: false,
        uploadOnly: false,
        noDisplay: false,
        uploadSimplified: false,
        concurrency: 8,
        versionTag: DEFAULT_VERSION,
        simplify: 0.001,
    };

    for (const a of argv) {
        if (a === "--generate-only") args.generateOnly = true;
        if (a === "--upload-only") args.uploadOnly = true;
        if (a === "--no-display") args.noDisplay = true;
        if (a === "--upload-simplified") args.uploadSimplified = true;

        if (a.startsWith("--concurrency=")) {
            const n = Number(a.split("=")[1]);
            if (!Number.isFinite(n) || n <= 0) {
                throw new Error(`Invalid --concurrency: ${a}`);
            }
            args.concurrency = Math.floor(n);
        }

        if (a.startsWith("--version=")) {
            const v = a.split("=")[1]?.trim();
            if (!v) throw new Error(`Invalid --version: ${a}`);
            args.versionTag = v;
        }

        if (a.startsWith("--vintage=")) {
            const v = a.split("=")[1]?.trim();
            if (!v) throw new Error(`Invalid --vintage: ${a}`);
            args.versionTag = v;
        }

        if (a.startsWith("--simplify=")) {
            const n = Number(a.split("=")[1]);
            if (!Number.isFinite(n) || n < 0) {
                throw new Error(`Invalid --simplify: ${a}`);
            }
            args.simplify = n;
        }
    }

    // If user sets both, we still honor upload-only (skip gen)
    if (args.generateOnly && args.uploadOnly) {
        // prefer explicit upload-only behavior
        args.generateOnly = false;
    }

    return args;
}

// ----------------------------
// Paths / artifacts
// ----------------------------

function ensureDir(p: string) {
    fs.mkdirSync(p, { recursive: true });
}

function artifactDir(versionTag: string) {
    return path.join(
        process.cwd(),
        "scripts",
        "geojson",
        DATASET_KEY,
        versionTag,
    );
}

function artifactPaths(versionTag: string) {
    const dir = artifactDir(versionTag);
    return {
        dir,
        inputGeoJSON: path.join(dir, "input.geojson"),
        displayGeoJSON: path.join(dir, "display.geojson"),
        metadataJSON: path.join(dir, "metadata.json"),
    };
}

function assertFileExists(p: string) {
    if (!fs.existsSync(p)) {
        throw new Error(`Expected file does not exist: ${p}`);
    }
}

// ----------------------------
// GeoJSON types
// ----------------------------

type GeoJSONGeometry =
    | { type: "Point"; coordinates: [number, number] }
    | { type: "MultiPolygon"; coordinates: any }
    | { type: "Polygon"; coordinates: any }
    | { type: "GeometryCollection"; geometries: GeoJSONGeometry[] }
    | { type: string; coordinates?: any };

type GeoJSONFeature = {
    type: "Feature";
    properties: Record<string, any>;
    geometry: GeoJSONGeometry | null;
};

type FeatureCollection = {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
};

function readGeoJSON(p: string): FeatureCollection {
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);
    if (
        parsed?.type !== "FeatureCollection" || !Array.isArray(parsed.features)
    ) {
        throw new Error(`Invalid GeoJSON FeatureCollection: ${p}`);
    }
    return parsed as FeatureCollection;
}

function writeGeoJSON(p: string, fc: FeatureCollection) {
    fs.writeFileSync(p, JSON.stringify(fc));
}

function writeMetadata(params: {
    metadataJSON: string;
    versionTag: string;
    sourceTag: string;
    inputGeoJSON: string;
}) {
    const payload = {
        dataset_key: DATASET_KEY,
        dataset_version: params.versionTag,
        source_tag: params.sourceTag,
        zip_url: DOWNLOAD_URL,
        generated_at: new Date().toISOString(),
        output_geojson: path.relative(process.cwd(), params.inputGeoJSON),
    };
    fs.writeFileSync(params.metadataJSON, JSON.stringify(payload, null, 2));
}

// ----------------------------
// Shell helpers
// ----------------------------

function sh(cmd: string) {
    execSync(cmd, { stdio: "inherit" });
}

function shOut(cmd: string): string {
    return execSync(cmd, { encoding: "utf8" }).trim();
}

function tmpWorkdir(prefix: string) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}_`));
    ensureDir(dir);
    return dir;
}

// ----------------------------
// Supabase
// ----------------------------

function getSupabaseEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL;
    const servicekey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
    }
    if (!servicekey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    return { url, servicekey };
}

function supabaseAdmin(): SupabaseClient {
    const { url, servicekey } = getSupabaseEnv();
    return createClient(url, servicekey, { auth: { persistSession: false } });
}

type DistrictIndex = {
    // key is sdorgid normalized string
    bySdorgid: Map<string, string>; // entity_id
    byEntityIdExternalIds: Map<string, Record<string, any>>; // entity_id -> external_ids
};

function normalizeSdorgid(v: any): string {
    if (v == null) return "";
    // GIS exports sometimes come as float-ish. We want integer string.
    const s = String(v).trim();
    if (!s) return "";
    // handle "10277000000.0" etc
    if (s.includes(".")) {
        const [intPart] = s.split(".");
        return intPart;
    }
    return s;
}

async function fetchDistrictIndex(
    supabase: SupabaseClient,
): Promise<DistrictIndex> {
    const bySdorgid = new Map<string, string>();
    const byEntityIdExternalIds = new Map<string, Record<string, any>>();

    const { data, error } = await supabase
        .from("entities")
        .select("id, external_ids")
        .eq("entity_type", "district")
        .limit(20000);

    if (error) {
        throw new Error(`Failed to load district entities: ${error.message}`);
    }

    for (const r of data ?? []) {
        const externalIds =
            (r as { external_ids?: Record<string, unknown> }).external_ids ??
            null;
        const entityId = (r as { id?: string }).id;
        if (entityId) {
            byEntityIdExternalIds.set(
                entityId,
                (externalIds ?? {}) as Record<string, any>,
            );
        }
        const sdorgid =
            externalIds?.sdorgid ??
            externalIds?.sd_org_id ??
            externalIds?.district_id ??
            null;
        const key = normalizeSdorgid(sdorgid);
        if (key && entityId) {
            bySdorgid.set(key, entityId as string);
        }
    }

    if (bySdorgid.size === 0) {
        throw new Error(
            "Could not build district index. Ensure district entities exist with external_ids.sdorgid values.",
        );
    }

    return { bySdorgid, byEntityIdExternalIds };
}

// ----------------------------
// Geo processing
// ----------------------------

function detectGpkgFile(dir: string): string {
    const files = fs.readdirSync(dir);
    const gpkg = files.find((f) => f.toLowerCase().endsWith(".gpkg"));
    if (!gpkg) {
        throw new Error(
            `No .gpkg found after unzip in ${dir}. Files: ${files.join(", ")}`,
        );
    }
    return path.join(dir, gpkg);
}

function detectGpkgLayerNames(gpkgPath: string): string[] {
    // ogrinfo -ro -so <gpkg>
    // Output format varies; we keep it simple and parse layer lines.
    const out = shOut(`ogrinfo -ro -so "${gpkgPath}"`);
    const lines = out.split(/\r?\n/);
    const layers: string[] = [];
    for (const line of lines) {
        // Example: "1: school_district_boundaries (Multi Polygon)"
        const m = line.match(/^\s*\d+\s*:\s*([^\(]+)\(/);
        if (m?.[1]) layers.push(m[1].trim());
    }
    return layers;
}

function convertGpkgToGeoJSON(gpkgPath: string, outGeoJSON: string) {
    // Convert all layers into one output; if multiple layers exist, ogr2ogr will pick first unless -nln.
    // We detect layers and use the first, but log what we found.
    const layers = detectGpkgLayerNames(gpkgPath);
    if (layers.length) {
        console.log(`• GeoPackage layers detected: ${layers.join(", ")}`);
    } else {
        console.log(
            "• Could not detect layer names via ogrinfo; proceeding with ogr2ogr default.",
        );
    }

    const layerOpt = layers.length ? ` "${layers[0]}"` : "";

    // -makevalid helps avoid PostGIS failures later
    sh(
        `ogr2ogr -f GeoJSON -t_srs EPSG:4326 -makevalid "${outGeoJSON}" "${gpkgPath}"${layerOpt}`,
    );
}

function buildDisplayGeoJSON(
    input: FeatureCollection,
    simplifyTolerance: number,
): FeatureCollection {
    // Keep only a minimal, stable set of properties.
    // District boundaries should include sdorgid + name fields (sdprefname or similar).
    // We keep all *district identifying* props if present, but avoid huge/irrelevant fields.

    const keepKeys = new Set([
        "sdorgid",
        "sdprefname",
        "sdname",
        "district",
        "district_name",
        "isd_no",
        "isd",
        "isdname",
        "mde_orgid",
    ]);

    // We simplify using ogr2ogr if desired (more reliable than JS topo ops),
    // but since we already have GeoJSON loaded, we can do a lightweight pass by re-running ogr2ogr
    // via an in-memory temp file. This keeps behavior consistent with your other scripts.

    const tmpDir = tmpWorkdir("mn_district_boundaries_display");
    const inPath = path.join(tmpDir, "in.geojson");
    const outPath = path.join(tmpDir, "out.geojson");
    try {
        writeGeoJSON(inPath, input);

        // -simplify with preserve topology is not guaranteed, but for district boundaries it has been fine.
        // We also select properties by keeping them in the output JSON post-process.
        sh(
            `ogr2ogr -f GeoJSON -t_srs EPSG:4326 -makevalid -simplify ${simplifyTolerance} "${outPath}" "${inPath}"`,
        );

        const simplified = readGeoJSON(outPath);

        const features: GeoJSONFeature[] = simplified.features.map((f) => {
            const props: Record<string, any> = {};
            for (const [k, v] of Object.entries(f.properties || {})) {
                if (keepKeys.has(k)) props[k] = v;
            }

            // Ensure sdorgid survives in normalized form if present under any casing.
            if (props.sdorgid == null) {
                const sd = (f.properties as any)?.sdorgid ??
                    (f.properties as any)?.SDORGID;
                if (sd != null) props.sdorgid = sd;
            }

            // Attempt to fill a name-like field
            if (!props.sdprefname) {
                const nameCandidate = (f.properties as any)?.sdprefname ||
                    (f.properties as any)?.SDPREFNAME ||
                    (f.properties as any)?.sdname ||
                    (f.properties as any)?.isdname ||
                    (f.properties as any)?.name;
                if (nameCandidate) props.sdprefname = nameCandidate;
            }

            return { type: "Feature", geometry: f.geometry, properties: props };
        });

        return { type: "FeatureCollection", features };
    } finally {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            // ignore
        }
    }
}

function toBbox(fcOrGeom: any) {
    // Very lightweight bbox from coordinates.
    // Assumes GeoJSON in EPSG:4326.
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

    function visitCoords(coords: any) {
        if (!coords) return;
        if (typeof coords[0] === "number" && typeof coords[1] === "number") {
            const x = coords[0];
            const y = coords[1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            return;
        }
        for (const c of coords) visitCoords(c);
    }

    if (fcOrGeom?.type === "FeatureCollection") {
        for (const f of fcOrGeom.features || []) {
            visitCoords(f?.geometry?.coordinates);
        }
    } else if (fcOrGeom?.coordinates) {
        visitCoords(fcOrGeom.coordinates);
    }

    if (!Number.isFinite(minX)) {
        return null;
    }

    return { minX, minY, maxX, maxY };
}

// ----------------------------
// Upload
// ----------------------------

async function upsertGeometry(
    supabase: SupabaseClient,
    params: {
        entityId: string;
        geometryType: string;
        source: string;
        geojson: FeatureCollection; // we store FC for rendering
        geomGeoJSON: any; // geometry or FC; depends on your RPC
        bbox: any;
    },
) {
    const { error } = await supabase.rpc(
        "upsert_entity_geometry_with_geom_geojson",
        {
            p_entity_id: params.entityId,
            p_geometry_type: params.geometryType,
            p_geojson: params.geojson,
            p_geom_geojson: params.geomGeoJSON,
            p_bbox: params.bbox,
            p_source: params.source,
        },
    );

    if (error) throw error;
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

function numOrNull(v: any): number | null {
    if (v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
}

function curatedDistrictAttrs(props: Record<string, any>, source: string) {
    // Normalize common MDE keys from varying casing.
    const sdorgid = normalizeSdorgid(props.sdorgid ?? props.SDORGID);
    const formid = String(props.formid ?? props.FORMID ?? "").trim() || null;
    const sdnumber = String(props.sdnumber ?? props.SDNUMBER ?? "").trim() ||
        null;
    const sdtype = String(props.sdtype ?? props.SDTYPE ?? "").trim() || null;
    const prefname = String(props.prefname ?? props.PREFNAME ?? "").trim() ||
        null;
    const shortname =
        String(props.shortname ?? props.SHORTNAME ?? "").trim() || null;
    const web_url = String(props.web_url ?? props.WEB_URL ?? "").trim() || null;

    return stripNullish({
        source,
        sdorgid,
        formid,
        sdnumber,
        sdtype,
        prefname,
        shortname,
        web_url,
        acres: numOrNull(props.acres ?? props.ACRES),
        sqmiles: numOrNull(props.sqmiles ?? props.SQMILES),
    });
}

async function upsertEntityExternalIds(
    supabase: SupabaseClient,
    params: {
        entityId: string;
        existingExternalIds: Record<string, any>;
        patch: Record<string, any>;
    },
) {
    const merged = { ...(params.existingExternalIds ?? {}) };
    for (const [k, v] of Object.entries(params.patch)) {
        if (v === null || v === undefined) continue;
        if (typeof v === "string" && v.trim() === "") continue;
        merged[k] = v;
    }

    const { error } = await supabase
        .from("entities")
        .update({ external_ids: merged } as any)
        .eq("id", params.entityId);

    if (error) throw error;
}

async function upsertEntityAttributes(
    supabase: SupabaseClient,
    params: { entityId: string; namespace: string; attrs: Record<string, any> },
) {
    const { error } = await supabase
        .from("entity_attributes")
        .upsert(
            {
                entity_id: params.entityId,
                namespace: params.namespace,
                attrs: params.attrs,
            } as any,
            { onConflict: "entity_id,namespace" },
        );

    if (error) throw error;
}

async function upsertEntitySourceRecord(
    supabase: SupabaseClient,
    params: {
        entityId: string;
        source: string;
        externalKey: string | null;
        payload: Record<string, any>;
    },
) {
    const { error } = await supabase
        .from("entity_source_records")
        .upsert(
            {
                entity_id: params.entityId,
                source: params.source,
                external_key: params.externalKey,
                payload: params.payload,
            } as any,
            { onConflict: "entity_id,source" },
        );

    if (error) throw error;
}

async function upsertDistrictMetadata(
    supabase: SupabaseClient,
    params: { entityId: string; curated: Record<string, any> },
) {
    const curated = params.curated ?? {};
    const { error } = await supabase
        .from("district_metadata")
        .upsert(
            {
                entity_id: params.entityId,
                sdorgid: (curated as any).SDORGID ?? curated.sdorgid ?? null,
                formid: (curated as any).FORMID ?? curated.formid ?? null,
                sdnumber: (curated as any).SDNUMBER ?? curated.sdnumber ?? null,
                sdtype: (curated as any).SDTYPE ?? curated.sdtype ?? null,
                prefname: (curated as any).PREFNAME ??
                    (curated as any).sdprefname ??
                    curated.prefname ??
                    null,
                shortname: (curated as any).SHORTNAME ??
                    curated.shortname ??
                    null,
                web_url: (curated as any).WEB_URL ?? curated.web_url ?? null,
                acres: (curated as any).ACRES ?? curated.acres ?? null,
                sqmiles: (curated as any).SQMILES ?? curated.sqmiles ?? null,
            } as any,
            { onConflict: "entity_id" },
        );

    if (error) throw error;
}

async function uploadPerDistrict(
    supabase: SupabaseClient,
    fc: FeatureCollection,
    districtIndex: DistrictIndex,
    geometryType: string,
    source: string,
    concurrency: number,
) {
    // Many datasets are one feature per district, but we support multi-feature per district
    const groups = new Map<string, GeoJSONFeature[]>(); // entity_id -> features
    let skipped = 0;

    for (const f of fc.features) {
        const sdorgid = normalizeSdorgid(
            f.properties?.sdorgid ?? (f.properties as any)?.SDORGID,
        );
        if (!sdorgid) {
            skipped++;
            continue;
        }
        const entityId = districtIndex.bySdorgid.get(sdorgid);
        if (!entityId) {
            skipped++;
            continue;
        }
        const arr = groups.get(entityId) || [];
        arr.push(f);
        groups.set(entityId, arr);
    }

    console.log(`• District groups to upsert: ${groups.size}`);
    if (skipped) {
        console.log(`• Features skipped (no sdorgid match): ${skipped}`);
    }

    const entries = Array.from(groups.entries());

    // simple concurrency pool
    let idx = 0;
    let done = 0;

    async function worker() {
        while (idx < entries.length) {
            const myIdx = idx++;
            const [entityId, features] = entries[myIdx];

            const perDistrictFC: FeatureCollection = {
                type: "FeatureCollection",
                features,
            };

            // PostGIS ST_GeomFromGeoJSON expects a GeoJSON *Geometry*, not a Feature/FeatureCollection.
            // District boundaries should be one feature per district; if not, we fall back to a GeometryCollection.
            const geoms = features
                .map((f) => f.geometry)
                .filter((g): g is GeoJSONGeometry => Boolean(g));

            if (geoms.length === 0) {
                console.warn("Skipping district with null geometry", {
                    entityId,
                });
                continue;
            }

            const geomGeoJSON: GeoJSONGeometry = geoms.length === 1
                ? geoms[0]
                : { type: "GeometryCollection", geometries: geoms };

            const bbox = toBbox(geomGeoJSON);

            await upsertGeometry(supabase, {
                entityId,
                geometryType,
                source,
                geojson: perDistrictFC, // keep FC for client rendering
                geomGeoJSON, // geometry only for PostGIS
                bbox,
            });

            // --- 4/5/6: external_ids + entity_attributes + entity_source_records ---
            const first = features[0];
            const props = (first?.properties ?? {}) as Record<string, any>;

            // identity keys
            const sdorgid = normalizeSdorgid(props.sdorgid ?? props.SDORGID);
            const formid = String(props.formid ?? props.FORMID ?? "").trim() ||
                null;
            const sdnumber =
                String(props.sdnumber ?? props.SDNUMBER ?? "").trim() || null;
            const sdtype = String(props.sdtype ?? props.SDTYPE ?? "").trim() ||
                null;

            const existingExternalIds =
                districtIndex.byEntityIdExternalIds.get(entityId) ?? {};

            await upsertEntityExternalIds(supabase, {
                entityId,
                existingExternalIds,
                patch: {
                    source,
                    sdorgid,
                    formid,
                    sdnumber,
                    sdtype,
                },
            });

            // refresh cache
            districtIndex.byEntityIdExternalIds.set(entityId, {
                ...existingExternalIds,
                source,
                sdorgid,
                formid,
                sdnumber,
                sdtype,
            });

            // curated attrs
            const curated = curatedDistrictAttrs(props, source);
            await upsertEntityAttributes(supabase, {
                entityId,
                namespace: "mde",
                attrs: curated,
            });
            await upsertDistrictMetadata(supabase, {
                entityId,
                curated,
            });

            // full payload
            await upsertEntitySourceRecord(supabase, {
                entityId,
                source,
                externalKey: sdorgid || null,
                payload: props,
            });

            done++;
            if (done % 25 === 0 || done === entries.length) {
                console.log(
                    `✓ Upserted ${done}/${entries.length} districts...`,
                );
            }
        }
    }

    const workers = Array.from({
        length: Math.min(concurrency, entries.length),
    }, () => worker());
    await Promise.all(workers);
    console.log(`✓ Upload complete. Districts upserted: ${entries.length}`);
}

// ----------------------------
// Main
// ----------------------------

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const { dir, inputGeoJSON, displayGeoJSON, metadataJSON } = artifactPaths(
        args.versionTag,
    );
    ensureDir(dir);

    const sourceTag = `${DATASET_KEY}_${args.versionTag}`;

    console.log("Dataset info:");
    console.log(`• source_url: ${DOWNLOAD_URL}`);
    console.log(`• source_tag: ${sourceTag}`);
    console.log(`• version_tag: ${args.versionTag}`);
    console.log(`• input_geojson: ${inputGeoJSON}`);
    console.log(`• display_geojson: ${displayGeoJSON}`);
    console.log(`• metadata_json: ${metadataJSON}`);

    if (!args.uploadOnly) {
        console.log("⬇️  Downloading district boundaries GeoPackage ZIP...");
        console.log(`• URL: ${DOWNLOAD_URL}`);

        const workdir = tmpWorkdir("mn_district_boundaries");
        const zipPath = path.join(workdir, "district_boundaries.zip");

        try {
            // download
            sh(`curl -L -o "${zipPath}" "${DOWNLOAD_URL}"`);

            // unzip
            sh(`unzip -o "${zipPath}" -d "${workdir}"`);

            const gpkgPath = detectGpkgFile(workdir);
            console.log(`• GeoPackage: ${gpkgPath}`);

            console.log("🗺️  Converting GeoPackage → GeoJSON (EPSG:4326)...");
            convertGpkgToGeoJSON(gpkgPath, inputGeoJSON);

            assertFileExists(inputGeoJSON);
            const inputFC = readGeoJSON(inputGeoJSON);
            console.log(
                `✓ Input GeoJSON created. Features in file: ${inputFC.features.length}`,
            );

            if (!args.noDisplay) {
                console.log(
                    "🧪 Generating display (simplified) district boundaries GeoJSON...",
                );
                console.log(`• Simplify tolerance: ${args.simplify}`);
                const displayFC = buildDisplayGeoJSON(inputFC, args.simplify);
                writeGeoJSON(displayGeoJSON, displayFC);
                console.log(
                    `✓ Display GeoJSON created. Features in file: ${displayFC.features.length}`,
                );
            } else {
                console.log(
                    "ℹ️  --no-display specified; skipping display generation.",
                );
            }

            writeMetadata({
                metadataJSON,
                versionTag: args.versionTag,
                sourceTag,
                inputGeoJSON,
            });
        } finally {
            try {
                fs.rmSync(workdir, { recursive: true, force: true });
            } catch {
                // ignore
            }
        }
    } else {
        console.log(
            "ℹ️  --upload-only specified; skipping download/conversion/generation.",
        );
    }

    if (args.generateOnly) {
        console.log(
            "ℹ️  --generate-only specified; stopping after file generation.",
        );
        return;
    }

    // Upload
    console.log("☁️  Uploading district boundary geometries to Supabase...");

    // Prefer display for upload if present (smaller + consistent props), else input.
    const uploadPath = !args.noDisplay && fs.existsSync(displayGeoJSON)
        ? displayGeoJSON
        : inputGeoJSON;
    assertFileExists(uploadPath);

    const fc = readGeoJSON(uploadPath);
    console.log(`• Features in upload file: ${fc.features.length}`);

    const supabase = supabaseAdmin();
    const districtIndex = await fetchDistrictIndex(supabase);
    console.log(`• Districts indexed: ${districtIndex.bySdorgid.size}`);

    // Upload boundary
    await uploadPerDistrict(
        supabase,
        fc,
        districtIndex,
        GEOMETRY_TYPE_BOUNDARY,
        sourceTag,
        args.concurrency,
    );

    // Optionally upload boundary_simplified too (using the same upload FC)
    if (args.uploadSimplified) {
        console.log("☁️  Uploading boundary_simplified geometries...");
        await uploadPerDistrict(
            supabase,
            fc,
            districtIndex,
            GEOMETRY_TYPE_BOUNDARY_SIMPLIFIED,
            `${sourceTag}_simplified`,
            args.concurrency,
        );
    }

    console.log("Done.");
}

main().catch((err) => {
    console.error("\n❌ Import failed:");
    console.error({
        code: (err as any)?.code ?? null,
        details: (err as any)?.details ?? null,
        hint: (err as any)?.hint ?? null,
        message: (err as any)?.message ?? String(err),
    });
    process.exit(1);
});
