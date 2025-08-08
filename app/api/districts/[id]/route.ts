// export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "../../../../utils/supabase/server";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    // rest of your code
    const supabase = await createClient();
    // NOTE: Ignore the warning. It’s not blocking anything, and it’ll go away in future stable versions. It’s a known false-positive in Next.js 14+.

    if (!id) {
        return NextResponse.json({ error: "Missing district ID" }, {
            status: 400,
        });
    }

    const { data: district, error: districtError } = await supabase
        .from("districts")
        .select(
            "sdorgid, properties, geometry, centroid_lat, centroid_lng, district_metadata(logo_path)",
        )
        .eq("sdorgid", id)
        .maybeSingle();

    if (districtError || !district) {
        return NextResponse.json({ error: "District not found" }, {
            status: 404,
        });
    }

    // const { data: foundation } = await supabase
    //     .from("foundations")
    //     .select("*")
    //     .eq("district_id", id)
    //     .maybeSingle();

    const rawProps = typeof district.properties === "string"
        ? JSON.parse(district.properties)
        : district.properties;

    const props = Object.fromEntries(
        Object.entries(rawProps).map(([k, v]) => [k.toLowerCase(), v]),
    );

    const feature = {
        type: "Feature",
        sdorgid: district.sdorgid,
        shortname: props?.shortname ?? "",
        centroid_lat: district.centroid_lat,
        centroid_lng: district.centroid_lng,
        properties: {
            sdorgid: district.sdorgid,
            centroid_lat: district.centroid_lat,
            centroid_lng: district.centroid_lng,
            ...props,
        },
        geometry: district.geometry,
        // foundation: district.foundation,
        metadata: district.district_metadata,
    };

    return NextResponse.json(feature, { status: 200 });
}
