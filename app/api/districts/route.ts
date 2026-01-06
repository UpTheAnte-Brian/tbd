export const revalidate = 3600; // cache this route for 1 hour
export const dynamic = "force-static";
import { NextResponse } from "next/server";
import type { DistrictDetails } from "@/app/lib/types/types";
import { createApiClient } from "@/utils/supabase/route";
import type { Database } from "@/database.types";
type EntityRow = Pick<
    Database["public"]["Tables"]["entities"]["Row"],
    "id" | "external_ids"
>;
type DistrictRow = Pick<
    Database["public"]["Tables"]["districts"]["Row"],
    | "id"
    | "sdorgid"
    | "shortname"
    | "status"
    | "properties"
    | "centroid_lat"
    | "centroid_lng"
    | "entity_id"
>;

export async function GET() {
    const supabase = await createApiClient();
    console.log("API: /api/districts -> executed at", new Date().toISOString());
    console.time("sb fetch districts");
    const { data: districtsRaw, error: districtError } = await supabase
        .from("districts")
        .select(
            "id, sdorgid, shortname, status, properties, centroid_lat, centroid_lng, entity_id",
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

    const { data: entityRowsRaw, error: entityError } = await supabase
        .from("entities")
        .select("id, external_ids")
        .eq("entity_type", "district");

    if (entityError) {
        return new Response("Failed to fetch entity data", { status: 500 });
    }

    const entityBySdorgid = new Map<string, string>();
    const entityByDistrictId = new Map<string, string>();
    const entityRows = (entityRowsRaw ?? []) as EntityRow[];
    for (const row of entityRows) {
        const externalIds =
            (row.external_ids as Record<string, unknown> | null) ??
            null;
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

    const asString = (
        val: unknown,
        fallback: string | null = "",
    ): string | null => typeof val === "string" ? val : fallback;

    const rows: DistrictDetails[] = [];
    const districts = (districtsRaw ?? []) as DistrictRow[];
    for (const row of districts) {
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

        const entityId = row.entity_id ??
            entityBySdorgid.get(row.sdorgid) ??
            entityByDistrictId.get(row.id);
        if (!entityId) {
            return new Response("Missing entity for district", { status: 500 });
        }

        rows.push({
            id: row.id,
            entity_id: entityId,
            sdorgid: row.sdorgid,
            shortname: row.shortname ?? null,
            prefname: asString(propsLower.prefname, row.shortname) ?? null,
            sdnumber: asString(propsLower.sdnumber, "") ?? null,
            web_url: asString(propsLower.web_url, "") ?? null,
            acres: asNumber(propsLower.acres),
            formid: asString(propsLower.formid, null),
            sdtype: asString(propsLower.sdtype, null),
            sqmiles: asNumber(propsLower.sqmiles),
            shape_area: asNumber(propsLower.shape_area),
            shape_leng: asNumber(propsLower.shape_leng),
            status: row.status ?? null,
            centroid_lat: row.centroid_lat ?? null,
            centroid_lng: row.centroid_lng ?? null,
        });
    }
    console.timeEnd("combine districts");

    return NextResponse.json({
        districts: rows,
    });
}
