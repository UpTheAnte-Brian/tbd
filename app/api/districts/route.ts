export const revalidate = 3600; // cache this route for 1 hour
export const dynamic = "force-static";
import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
// import { supabaseServiceClient } from "@/utils/supabase/service-worker";
import { createApiClient } from "@/utils/supabase/route";

export async function GET() {
    const supabase = await createApiClient();
    console.log("API: /api/districts -> executed at", new Date().toISOString());
    console.time("sb fetch districts");
    const { data: districts, error: districtError } = await supabase
        .from("districts")
        .select(
            "id, sdorgid, shortname, properties, geometry_simplified, centroid_lat, centroid_lng",
        );
    console.timeEnd("sb fetch districts");
    console.time("combine districts");

    // await supabaseServiceClieµnt.auth.admin.updateUserById(
    //     "002c3f9d-91ba-4792-b1e3-581d3a19fce5",
    //     {
    //         app_metadata: { role: "admin" },
    //     },
    // );

    if (districtError) {
        return new Response("Failed to fetch data", { status: 500 });
    }

    const { data: entityRows, error: entityError } = await supabase
        .from("entities")
        .select("id, external_ids")
        .eq("entity_type", "district");

    if (entityError) {
        return new Response("Failed to fetch entity data", { status: 500 });
    }

    const entityBySdorgid = new Map<string, string>();
    const entityByDistrictId = new Map<string, string>();
    for (const row of entityRows ?? []) {
        const externalIds = row.external_ids as Record<string, unknown> | null;
        const sdorgid = typeof externalIds?.sdorgid === "string"
            ? externalIds.sdorgid
            : null;
        const districtId = typeof externalIds?.district_id === "string"
            ? externalIds.district_id
            : null;
        if (sdorgid) {
            entityBySdorgid.set(sdorgid, row.id);
        }
        if (districtId) {
            entityByDistrictId.set(districtId, row.id);
        }
    }

    const asNumber = (val: unknown): number | null => {
        if (val === null || val === undefined || val === "") return null;
        const num = Number(val);
        return Number.isFinite(num) ? num : null;
    };

    const asString = (val: unknown, fallback: string | null = ""): string | null =>
        typeof val === "string" ? val : fallback;

    const features = districts?.map((row) => {
        const rawProps = (() => {
            if (!row.properties) return {};
            if (typeof row.properties === "string") {
                try {
                    return JSON.parse(row.properties);
                } catch {
                    return {};
                }
            }
            return row.properties;
        })() as Record<string, unknown>;
        const propsLower = Object.fromEntries(
            Object.entries(rawProps).map(([k, v]) => [k.toLowerCase(), v]),
        ) as Record<string, unknown>;

        const props = {
            sdorgid: row.sdorgid,
            shortname: row.shortname,
            prefname: asString(propsLower.prefname, row.shortname) ?? "",
            sdnumber: asString(propsLower.sdnumber, "") ?? "",
            web_url: asString(propsLower.web_url, "") ?? "",
            acres: asNumber(propsLower.acres),
            formid: asString(propsLower.formid, null),
            sdtype: asString(propsLower.sdtype, null),
            sqmiles: asNumber(propsLower.sqmiles),
            shape_area: asNumber(propsLower.shape_area),
            shape_leng: asNumber(propsLower.shape_leng),
            centroid_lat: row.centroid_lat,
            centroid_lng: row.centroid_lng,
        };

        const entityId = entityBySdorgid.get(row.sdorgid) ??
            entityByDistrictId.get(row.id);

        return {
            type: "Feature",
            id: row.id,
            entity_id: entityId,
            properties: props,
            geometry: row.geometry_simplified,
        };
    });
    console.timeEnd("combine districts");

    return NextResponse.json({
        type: "FeatureCollection",
        features,
    });
}
