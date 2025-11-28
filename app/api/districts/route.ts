export const revalidate = 3600; // cache this route for 1 hour
export const dynamic = "force-static";
import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
// import { supabaseServiceClient } from "@/utils/supabase/service-worker";
import { createApiClient } from "@/utils/supabase/route";

export async function GET() {
    const supabase = await createApiClient();
    console.log("API: /api/districts -> executed at", new Date().toISOString());
    console.time("sb fetch districts and foundations");
    const [foundationRes, districtRes] = await Promise.all([
        supabase.from("foundations").select("*"),
        supabase
            .from("districts")
            .select(
                "id, sdorgid, shortname, properties, geometry_simplified, centroid_lat, centroid_lng, district_metadata(logo_path)",
            ),
    ]);
    console.timeEnd("sb fetch districts and foundations");
    console.time("combine districts and foundations");

    const { data: foundations, error: foundationError } = foundationRes;
    const { data: districts, error: districtError } = districtRes;

    // await supabaseServiceClieµnt.auth.admin.updateUserById(
    //     "002c3f9d-91ba-4792-b1e3-581d3a19fce5",
    //     {
    //         app_metadata: { role: "admin" },
    //     },
    // );

    if (districtError || foundationError) {
        return new Response("Failed to fetch data", { status: 500 });
    }

    const enriched = districts?.map((d) => ({
        ...d,
        foundation: foundations?.find((f) => f.district_id === d.sdorgid) ??
            null,
    }));

    const features = enriched?.map((row) => {
        const rawProps = typeof row.properties === "string"
            ? JSON.parse(row.properties)
            : row.properties;

        const props = Object.fromEntries(
            Object.entries(rawProps).map(([k, v]) => [k.toLowerCase(), v]),
        );

        return {
            type: "Feature",
            sdorgid: row.sdorgid,
            id: row.id,
            shortname: row.shortname,
            centroid_lat: row.centroid_lat,
            centroid_lng: row.centroid_lng,
            properties: {
                sdorgid: row.sdorgid,
                centroid_lat: row.centroid_lat,
                centroid_lng: row.centroid_lng,
                ...props,
            },
            geometry: row.geometry_simplified,
            foundation: row.foundation,
            metadata: row.district_metadata,
        };
    });
    console.timeEnd("combine districts and foundations");

    return NextResponse.json({
        type: "FeatureCollection",
        features,
    });
}
