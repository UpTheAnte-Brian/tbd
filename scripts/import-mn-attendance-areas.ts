/**
 * import-mn-attendance-areas.ts
 *
 * End-to-end pipeline for MN school attendance areas:
 * 1) Generate a render-optimized GeoJSON using ogr2ogr (simplify + select props)
 * 2) Upload per-district FeatureCollections into Supabase via RPC upsert_entity_geometry_with_geom_geojson
 *
 * Notes:
 * - public.entity_geometries.geom is NOT NULL in this project, so we must populate geom.
 * - We add ogr2ogr -makevalid during generation to reduce PostGIS conversion failures.
 *
 * Prerequisites:
 * - GDAL installed (ogr2ogr available on PATH) unless using --upload-only
 * - Env vars:
 *    NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *    SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   tsx scripts/import-mn-attendance-areas.ts
 *   tsx scripts/import-mn-attendance-areas.ts --generate-only
 *   tsx scripts/import-mn-attendance-areas.ts --upload-only
 *   tsx scripts/import-mn-attendance-areas.ts --concurrency=8
 */

import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

type GeoJSONPosition = [number, number] | [number, number, number];

type GeoJSONGeometry =
    | { type: "Polygon"; coordinates: GeoJSONPosition[][] }
    | { type: "MultiPolygon"; coordinates: GeoJSONPosition[][][] };

type GeoJSONFeature = {
    type: "Feature";
    geometry: GeoJSONGeometry | null;
    properties?: Record<string, any> | null;
};

type FeatureCollection = {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
};

function stripTopLevelCrs(obj: any) {
    // RFC 7946 removed top-level `crs`; it can cause downstream parsing issues.
    if (obj && typeof obj === "object" && "crs" in obj) delete obj.crs;
}

function walkCoords(
    geom: GeoJSONGeometry,
    cb: (lng: number, lat: number) => void,
) {
    if (geom.type === "Polygon") {
        for (const ring of geom.coordinates) {
            for (const pos of ring) cb(pos[0], pos[1]);
        }
        return;
    }
    // MultiPolygon
    for (const poly of geom.coordinates) {
        for (const ring of poly) {
            for (const pos of ring) cb(pos[0], pos[1]);
        }
    }
}

function bboxGeometryFromFeatureCollection(
    fc: FeatureCollection,
): GeoJSONGeometry {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const f of fc.features) {
        if (!f.geometry) continue;
        walkCoords(f.geometry, (lng, lat) => {
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
            if (lng < minX) minX = lng;
            if (lat < minY) minY = lat;
            if (lng > maxX) maxX = lng;
            if (lat > maxY) maxY = lat;
        });
    }

    // Fallback: tiny valid polygon (prevents NULL/invalid geom)
    if (
        !Number.isFinite(minX) || !Number.isFinite(minY) ||
        !Number.isFinite(maxX) || !Number.isFinite(maxY)
    ) {
        return {
            type: "Polygon",
            coordinates: [[[0, 0], [0.00001, 0], [0.00001, 0.00001], [
                0,
                0.00001,
            ], [0, 0]]],
        };
    }

    // Avoid degenerate boxes
    if (minX === maxX) maxX = minX + 1e-6;
    if (minY === maxY) maxY = minY + 1e-6;

    return {
        type: "Polygon",
        coordinates: [[[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [
            minX,
            minY,
        ]]],
    };
}

function bboxJsonFromGeometry(bboxGeom: GeoJSONGeometry) {
    // bboxGeom is a simple Polygon with one ring: [[minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY],[minX,minY]]
    const ring = (bboxGeom.type === "Polygon") ? bboxGeom.coordinates[0] : null;
    if (!ring || ring.length < 4) return null;
    const [minX, minY] = ring[0] as [number, number];
    const [maxX, maxY] = ring[2] as [number, number];
    return { minX, minY, maxX, maxY };
}

const PROJECT_ROOT = process.cwd();

const INPUT_GEOJSON = path.join(
    PROJECT_ROOT,
    "scripts/geojson/mn_attendance_areas.geojson",
);

const OUTPUT_GEOJSON = path.join(
    PROJECT_ROOT,
    "scripts/geojson/attendance_areas_display.geojson",
);

// OGR simplify tolerance (degrees, EPSG:4326)
const SIMPLIFY_TOLERANCE = "0.001";

// Properties to retain in the output GeoJSON
const SELECT_FIELDS = [
    "sdorgid",
    "sdprefname",
    "elem_orgid",
    "elem_name",
    "midd_orgid",
    "midd_name",
    "high_orgid",
    "high_name",
];

const GEOMETRY_TYPE = "district_attendance_areas";
const SOURCE_TAG = "mn_gis_bdry_school_attendance_areas_SY2025_26";

function assertFileExists(filePath: string) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
}

function parseArgs(argv: string[]) {
    const args = new Set(argv.slice(2));
    const concurrencyArg = argv.find((a) => a.startsWith("--concurrency="));
    const concurrency = concurrencyArg
        ? Math.max(1, Number(concurrencyArg.split("=")[1] ?? "5"))
        : 5;

    return {
        generateOnly: args.has("--generate-only"),
        uploadOnly: args.has("--upload-only"),
        concurrency,
    };
}

function generateDisplayGeoJSON() {
    assertFileExists(INPUT_GEOJSON);

    console.log("🔧 Generating simplified attendance areas GeoJSON...");
    console.log(`• Input:  ${INPUT_GEOJSON}`);
    console.log(`• Output: ${OUTPUT_GEOJSON}`);
    console.log(`• Simplify tolerance: ${SIMPLIFY_TOLERANCE}`);
    console.log(`• Properties kept: ${SELECT_FIELDS.join(", ")}`);

    const command = [
        "ogr2ogr",
        "-f GeoJSON",
        `"${OUTPUT_GEOJSON}"`,
        `"${INPUT_GEOJSON}"`,
        "-nlt MULTIPOLYGON",
        "-makevalid",
        `-simplify ${SIMPLIFY_TOLERANCE}`,
        `-select ${SELECT_FIELDS.join(",")}`,
    ].join(" ");

    execSync(command, { stdio: "inherit" });

    console.log("✅ Display GeoJSON generated.");
}

function readFeatureCollection(filePath: string): FeatureCollection {
    assertFileExists(filePath);
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);

    if (
        !parsed ||
        parsed.type !== "FeatureCollection" ||
        !Array.isArray(parsed.features)
    ) {
        throw new Error(`Expected a GeoJSON FeatureCollection at: ${filePath}`);
    }

    stripTopLevelCrs(parsed);
    return parsed as FeatureCollection;
}

function getSupabaseEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
        throw new Error(
            "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL (preferred) or SUPABASE_URL.",
        );
    }
    if (!serviceKey) {
        throw new Error(
            "Missing SUPABASE_SERVICE_ROLE_KEY (required for seeding).",
        );
    }

    return { url, serviceKey };
}

async function fetchDistrictIndex(supabase: ReturnType<typeof createClient>) {
    // Build sdorgid -> entity_id index
    const { data, error } = await supabase
        .from("districts")
        .select("entity_id, sdorgid");

    if (error) throw error;
    if (!data) throw new Error("No districts returned from Supabase.");

    const index = new Map<string, string>();
    for (const row of data as Array<{ entity_id: string; sdorgid: string }>) {
        if (row.sdorgid && row.entity_id) {
            index.set(String(row.sdorgid), row.entity_id);
        }
    }

    return index;
}

function groupFeaturesByDistrictEntityId(
    fc: FeatureCollection,
    sdorgidToEntityId: Map<string, string>,
) {
    const groups = new Map<string, GeoJSONFeature[]>();
    const unmatchedSdorgids = new Map<string, number>();

    for (const f of fc.features) {
        const props = f.properties || {};
        const sdorgid = props.sdorgid != null ? String(props.sdorgid) : null;
        if (!sdorgid) continue;

        const districtEntityId = sdorgidToEntityId.get(sdorgid);
        if (!districtEntityId) {
            unmatchedSdorgids.set(
                sdorgid,
                (unmatchedSdorgids.get(sdorgid) ?? 0) + 1,
            );
            continue;
        }

        // Stamp the owning district into properties (handy for debugging/UI)
        f.properties = {
            ...(props ?? {}),
            district_entity_id: districtEntityId,
        };

        const arr = groups.get(districtEntityId) ?? [];
        arr.push(f);
        groups.set(districtEntityId, arr);
    }

    return { groups, unmatchedSdorgids };
}

function createLimiter(concurrency: number) {
    let active = 0;
    const queue: Array<() => void> = [];

    const next = () => {
        active--;
        const fn = queue.shift();
        if (fn) fn();
    };

    return async function limit<T>(fn: () => Promise<T>): Promise<T> {
        if (active >= concurrency) {
            await new Promise<void>((resolve) => queue.push(resolve));
        }
        active++;
        try {
            return await fn();
        } finally {
            next();
        }
    };
}

async function upsertDistrictAttendanceAreas(
    supabase: ReturnType<typeof createClient>,
    districtEntityId: string,
    features: GeoJSONFeature[],
) {
    const fc: FeatureCollection = { type: "FeatureCollection", features };

    // Clean up any legacy members that can cause parser issues.
    stripTopLevelCrs(fc);

    // Build a guaranteed-valid geometry for geom (bbox polygon).
    const bboxGeom = bboxGeometryFromFeatureCollection(fc);
    const bbox = bboxJsonFromGeometry(bboxGeom);

    const { error } = await supabase.rpc(
        "upsert_entity_geometry_with_geom_geojson",
        {
            p_entity_id: districtEntityId,
            p_geometry_type: GEOMETRY_TYPE,
            p_geojson: fc, // full FeatureCollection for rendering
            p_geom_geojson: bboxGeom, // bbox polygon for geom
            p_bbox: bbox, // optional convenience bbox json
            p_source: SOURCE_TAG,
        },
    );

    if (error) throw error;
}

async function uploadToSupabase(concurrency: number) {
    console.log("☁️  Uploading per-district attendance areas to Supabase...");

    const { url, serviceKey } = getSupabaseEnv();
    const supabase = createClient(url, serviceKey, {
        auth: { persistSession: false },
    });

    const districtIndex = await fetchDistrictIndex(supabase);
    console.log(`• Districts indexed: ${districtIndex.size}`);

    const fc = readFeatureCollection(OUTPUT_GEOJSON);
    console.log(`• Attendance area features in file: ${fc.features.length}`);

    const { groups, unmatchedSdorgids } = groupFeaturesByDistrictEntityId(
        fc,
        districtIndex,
    );

    if (unmatchedSdorgids.size > 0) {
        const totalUnmatched = Array.from(unmatchedSdorgids.values()).reduce(
            (a, b) => a + b,
            0,
        );
        console.warn(
            `⚠️  Unmatched sdorgid values: ${unmatchedSdorgids.size} (features: ${totalUnmatched})`,
        );
        const sample = Array.from(unmatchedSdorgids.entries()).slice(0, 10);
        console.warn(
            "   Sample unmatched sdorgids:",
            sample.map(([k, v]) => `${k}(${v})`).join(", "),
        );
    }

    const matchedCount = Array.from(groups.values()).reduce(
        (a, b) => a + b.length,
        0,
    );
    const matchRate = matchedCount / Math.max(1, fc.features.length);

    if (matchRate < 0.9) {
        throw new Error(
            `Match rate too low (${
                (matchRate * 100).toFixed(
                    1,
                )
            }%). Check districts.sdorgid alignment with GeoJSON properties.sdorgid.`,
        );
    }

    console.log(`• District groups to upsert: ${groups.size}`);
    console.log(
        `• Matched features: ${matchedCount} (${
            (matchRate * 100).toFixed(1)
        }%)`,
    );

    const limit = createLimiter(concurrency);

    let ok = 0;
    let failed = 0;

    await Promise.all(
        Array.from(groups.entries()).map(([districtEntityId, features]) =>
            limit(async () => {
                try {
                    await upsertDistrictAttendanceAreas(
                        supabase,
                        districtEntityId,
                        features,
                    );
                    ok++;
                    if (ok % 25 === 0) {
                        console.log(
                            `  ✓ Upserted ${ok}/${groups.size} districts...`,
                        );
                    }
                } catch (e: any) {
                    failed++;
                    console.error(
                        `❌ Failed upsert for district ${districtEntityId}:`,
                        e?.message ?? e,
                    );
                }
            })
        ),
    );

    if (failed > 0) {
        throw new Error(
            `Upload finished with failures: ${failed} districts failed.`,
        );
    }

    console.log(`✅ Upload complete. Districts upserted: ${ok}`);
}

async function main() {
    const { generateOnly, uploadOnly, concurrency } = parseArgs(process.argv);

    if (!uploadOnly) {
        try {
            generateDisplayGeoJSON();
        } catch (err: any) {
            console.error("❌ ogr2ogr failed.");
            console.error(err?.message ?? err);
            process.exit(1);
        }
    } else {
        console.log(
            "↪️  --upload-only specified; skipping ogr2ogr generation.",
        );
    }

    if (generateOnly) {
        console.log(
            "↪️  --generate-only specified; stopping after file generation.",
        );
        return;
    }

    assertFileExists(OUTPUT_GEOJSON);

    try {
        await uploadToSupabase(concurrency);
    } catch (err: any) {
        console.error("❌ Upload failed.");
        console.error(err?.message ?? err);
        process.exit(1);
    }
}

main();
