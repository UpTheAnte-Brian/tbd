import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { createClient } from "@supabase/supabase-js";
import { centroid } from "@turf/turf";
import type { FeatureCollection, Geometry } from "geojson";

// Configure Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Constants
const ZIP_URL =
    "https://resources.gisdata.mn.gov/pub/gdrs/data/pub/us_mn_state_mde/bdry_school_district_boundaries/shp_bdry_school_district_boundaries.zip";

const TMP_BASE = path.join(tmpdir(), "mn_districts_import");
const TMP_ZIP = path.join(TMP_BASE, "districts.zip");
const TMP_GEOJSON = path.join(TMP_BASE, "districts.geometry");

async function run() {
    console.log("🚀 Starting import of Minnesota school district boundaries");

    // Step 1: Setup temp folder
    if (fs.existsSync(TMP_BASE)) {
        fs.rmSync(TMP_BASE, { recursive: true });
    }
    fs.mkdirSync(TMP_BASE, { recursive: true });

    try {
        // Step 2: Download zip
        console.log("⬇️ Downloading shapefile ZIP...");
        execSync(`curl -L "${ZIP_URL}" -o "${TMP_ZIP}"`);

        // Step 3: Unzip
        console.log("📦 Unzipping...");
        execSync(`unzip -o "${TMP_ZIP}" -d "${TMP_BASE}"`);

        // Step 4: Find .shp file
        const shpFile = fs
            .readdirSync(TMP_BASE)
            .find((f) => f.endsWith(".shp") && !f.startsWith("."));
        if (!shpFile) throw new Error("Shapefile (.shp) not found in ZIP");
        const shpPath = path.join(TMP_BASE, shpFile);

        // Step 5: Convert to GeoJSON using ogr2ogr
        console.log("🗺️ Converting to GeoJSON...");
        execSync(
            `ogr2ogr -t_srs EPSG:4326 -f GeoJSON "${TMP_GEOJSON}" "${shpPath}"`,
        );

        // Step 6: Load GeoJSON
        console.log("📖 Reading GeoJSON...");
        const raw = fs.readFileSync(TMP_GEOJSON, "utf-8");
        const fc = JSON.parse(raw) as FeatureCollection<Geometry>;

        // Step 7: Enrich with centroid
        console.log(`🔍 Enriching ${fc.features.length} features...`);
        const enriched = fc.features.map((f) => {
            const rawProps = typeof f.properties === "string"
                ? JSON.parse(f.properties)
                : f.properties;

            const props = Object.fromEntries(
                Object.entries(rawProps).map(([k, v]) => [k.toLowerCase(), v]),
            ) || {};

            const center = centroid(f).geometry.coordinates;
            const [lng, lat] = center;

            return {
                sdorgid: props.sdorgid,
                sdorgname: props.SDORGNAME,
                shortname: props.shortname ?? null,
                geometry: f.geometry,
                properties: f.properties,
                centroid_lat: lat,
                centroid_lng: lng,
            };
        });

        // Step 8: Upsert to Supabase
        console.log("📤 Uploading to Supabase...");
        const { error } = await supabase
            .from("districts")
            .upsert(enriched, { onConflict: "sdorgid" });

        if (error) {
            console.error("❌ Supabase error:", error);
        } else {
            console.log(
                `✅ Successfully imported ${enriched.length} districts.`,
            );
        }
    } catch (err) {
        console.error("❌ Import failed:", err);
    } finally {
        // Step 9: Cleanup
        console.log("🧹 Cleaning up temp files...");
        fs.rmSync(TMP_BASE, { recursive: true, force: true });
        console.log("🏁 Done.");
    }
}

run();
