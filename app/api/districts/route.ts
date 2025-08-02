// app/api/districts/route.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET() {
    const { data: foundations, error: foundationError } = await supabase
        .from("foundations")
        .select("*");

    const { data: districts, error: districtError } = await supabase
        .from("districts")
        .select(
            "sdorgid, sdorgname, properties, geometry, centroid_lat, centroid_lng",
        );

    if (districtError || foundationError) {
        return new Response("Failed to fetch data", { status: 500 });
    }

    const enriched = districts?.map((d) => ({
        ...d,
        foundation: foundations?.find((f) => f.district_id === d.sdorgid) ??
            null,
    }));

    const features = enriched?.map((row) => ({
        type: "Feature",
        sdorgid: row.sdorgid,
        properties: {
            sdorgid: row.sdorgid,
            sdorgname: row.sdorgname,
            centroid_lat: row.centroid_lat,
            centroid_lng: row.centroid_lng,
            ...row.properties,
        },
        geometry: row.geometry,
    }));

    return Response.json({
        type: "FeatureCollection",
        features,
    });
}
