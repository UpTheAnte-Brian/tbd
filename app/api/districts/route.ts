export const revalidate = 3600; // cache this route for 1 hour
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import type { DistrictDetails } from "@/app/lib/types/types";
import { createApiClient } from "@/utils/supabase/route";
import type { Database } from "@/database.types";

type DistrictMetadataRow =
    Database["public"]["Tables"]["district_metadata"]["Row"];
type EntityRow = Pick<
    Database["public"]["Tables"]["entities"]["Row"],
    "id" | "external_ids" | "name" | "slug" | "active"
> & {
    district_metadata?: DistrictMetadataRow | DistrictMetadataRow[] | null;
};

export async function GET() {
    const supabase = await createApiClient();
    console.log("API: /api/districts -> executed at", new Date().toISOString());
    console.time("sb fetch districts");
    const { data: entitiesRaw, error: districtError } = await supabase
        .from("entities")
        .select(
            `
            id,
            external_ids,
            name,
            slug,
            active,
            district_metadata (
              web_url,
              sdorgid,
              shortname,
              prefname,
              sdnumber,
              acres,
              formid,
              sdtype,
              sqmiles
            )
          `,
        )
        .eq("entity_type", "district");
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
    const districts = (entitiesRaw ?? []) as EntityRow[];
    for (const row of districts) {
        const metadata =
            Array.isArray(row.district_metadata)
                ? row.district_metadata[0]
                : row.district_metadata;
        const externalIds =
            (row.external_ids as Record<string, unknown> | null) ?? {};
        const propsLower = Object.fromEntries(
            Object.entries(externalIds).map(([k, v]) => [k.toLowerCase(), v]),
        ) as Record<string, unknown>;
        const sdorgid =
            asString(metadata?.sdorgid, null) ??
            asString(propsLower.sdorgid, null) ??
            asString(propsLower.sd_org_id, null) ??
            asString(propsLower.district_id, null) ??
            row.slug ??
            row.id;

        rows.push({
            id: row.id,
            entity_id: row.id,
            sdorgid,
            shortname:
                asString(metadata?.shortname, row.name) ??
                asString(propsLower.shortname, row.name) ??
                null,
            prefname:
                asString(metadata?.prefname, row.name) ??
                asString(propsLower.prefname, row.name) ??
                null,
            sdnumber:
                asString(metadata?.sdnumber, null) ??
                asString(propsLower.sdnumber, "") ??
                null,
            web_url:
                asString(metadata?.web_url, null) ??
                asString(propsLower.web_url, "") ??
                null,
            acres:
                asNumber(metadata?.acres) ??
                asNumber(propsLower.acres),
            formid:
                asString(metadata?.formid, null) ??
                asString(propsLower.formid, null),
            sdtype:
                asString(metadata?.sdtype, null) ??
                asString(propsLower.sdtype, null),
            sqmiles:
                asNumber(metadata?.sqmiles) ??
                asNumber(propsLower.sqmiles),
            shape_area: asNumber(propsLower.shape_area),
            shape_leng: asNumber(propsLower.shape_leng),
            status: asString(propsLower.status, null) ??
                (row.active ? "active" : "inactive"),
            centroid_lat: asNumber(propsLower.centroid_lat),
            centroid_lng: asNumber(propsLower.centroid_lng),
        });
    }
    console.timeEnd("combine districts");

    return NextResponse.json({
        districts: rows,
    });
}
