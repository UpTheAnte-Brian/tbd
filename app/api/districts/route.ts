// app/api/districts/route.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET() {
    const { data, error } = await supabase
        .from("districts")
        .select("sdorgid, sdorgname, properties, geometry");

    if (error) {
        return new Response("Failed to fetch data", { status: 500 });
    }

    const features = data.map((row) => ({
        type: "Feature",
        properties: {
            sdorgid: row.sdorgid,
            sdorgname: row.sdorgname,
            ...row.properties,
        },
        geometry: row.geometry,
    }));

    return Response.json({
        type: "FeatureCollection",
        features,
    });
}
