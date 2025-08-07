// export const runtime = "nodejs";

import type { NextRequest } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "../../../../utils/supabase/server";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    const supabase = await createClient();
    // NOTE: Ignore the warning. It’s not blocking anything, and it’ll go away in future stable versions. It’s a known false-positive in Next.js 14+.

    if (!id) {
        return new Response("Missing district ID", { status: 400 });
    }

    const { data: district, error: districtError } = await supabase
        .from("districts")
        .select(
            "sdorgid, properties, centroid_lat, centroid_lng, district_metadata(logo_path)",
        )
        .eq("sdorgid", id)
        .maybeSingle();

    if (districtError || !district) {
        return new Response("District not found", { status: 404 });
    }

    const { data: foundation } = await supabase
        .from("foundations")
        .select("*")
        .eq("district_id", id)
        .maybeSingle();

    const rawProps = typeof district.properties === "string"
        ? JSON.parse(district.properties)
        : district.properties;

    const props = Object.fromEntries(
        Object.entries(rawProps).map(([k, v]) => [k.toLowerCase(), v]),
    );

    const feature = {
        type: "Feature",
        sdorgid: district.sdorgid,
        properties: {
            sdorgid: district.sdorgid,
            centroid_lat: district.centroid_lat,
            centroid_lng: district.centroid_lng,
            ...props,
        },
        foundation: foundation ?? null,
        metadata: district.district_metadata,
    };

    return Response.json(feature);
}
