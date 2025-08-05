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
        .select("sdorgid, sdorgname, properties, centroid_lat, centroid_lng")
        .eq("sdorgid", id)
        .single();

    if (districtError || !district) {
        return new Response("District not found", { status: 404 });
    }

    const { data: foundation } = await supabase
        .from("foundations")
        .select("*")
        .eq("district_id", id)
        .single();

    const feature = {
        type: "Feature",
        sdorgid: district.sdorgid,
        properties: {
            sdorgid: district.sdorgid,
            sdorgname: district.sdorgname,
            centroid_lat: district.centroid_lat,
            centroid_lng: district.centroid_lng,
            ...district.properties,
            foundation: foundation ?? null,
        },
    };

    return Response.json(feature);
}
