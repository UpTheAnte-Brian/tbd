// The client you created from the Server-Side Auth instructions
import { createClient } from "../../../utils/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data: foundations, error: foundationError } = await supabase
        .from("foundations")
        .select("*");

    const { data: districts, error: districtError } = await supabase
        .from("districts")
        .select(
            "sdorgid, shortname, properties, geometry, centroid_lat, centroid_lng, district_metadata(logo_path)",
        );
    // const supabaseAdmin = createClient(
    //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //   process.env.SUPABASE_SERVICE_ROLE_KEY! // needs admin privileges
    // );

    // await supabaseAdmin.auth.admin.updateUserById("fe1de8d1-b05e-4ee8-beb4-4d50f2d61cf0", {
    //   user_metadata: { role: "admin" },
    // });

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
            shortname: row.shortname,
            centroid_lat: row.centroid_lat,
            centroid_lng: row.centroid_lng,
            properties: {
                sdorgid: row.sdorgid,
                centroid_lat: row.centroid_lat,
                centroid_lng: row.centroid_lng,
                ...props,
            },
            geometry: row.geometry,
            foundation: row.foundation,
            metadata: row.district_metadata,
        };
    });

    return Response.json({
        type: "FeatureCollection",
        features,
    });
}
