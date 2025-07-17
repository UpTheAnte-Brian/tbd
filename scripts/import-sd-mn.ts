import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // requires insert/update privileges
);

async function main() {
    const file = path.resolve("", "scripts/geojson/mn-districts.geojson");
    const geojson = JSON.parse(fs.readFileSync(file, "utf-8"));

    const features = geojson.features;

    for (const feature of features) {
        const { properties, geometry } = feature;
        const sdorgid = properties?.SDORGID?.toString().trim();
        const sdorgname = properties?.SDORGNAME?.trim() ?? null;

        if (!sdorgid || !geometry) continue;

        const { error } = await supabase
            .from("districts")
            .upsert(
                {
                    sdorgid,
                    sdorgname,
                    properties,
                    geometry,
                },
                { onConflict: "sdorgid" },
            );

        if (error) {
            console.error(`❌ Error inserting ${sdorgid}: ${error.message}`);
        }
    }

    console.log(`✅ Imported ${features.length} districts.`);
}

main();
