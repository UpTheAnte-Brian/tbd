// The client you created from the Server-Side Auth instructions
import { createClient } from "../../../utils/supabase/server";

export async function GET() {
    const supabase = await createClient();

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

    return Response.json({
        type: "FeatureCollection",
        features,
    });
}
