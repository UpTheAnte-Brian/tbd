import { NextResponse } from "next/server";
import type { Geometry } from "geojson";
import { createApiClient } from "@/utils/supabase/route";
import type {
    EntityFeature,
    EntityFeatureCollection,
    EntityMapProperties,
} from "@/domain/map/types";

const isGeometry = (value: unknown): value is Geometry =>
    typeof value === "object" &&
    value !== null &&
    "type" in value;

export const revalidate = 86400;
export const dynamic = "force-dynamic";

export async function GET() {
    const supabase = await createApiClient();
    const { data: states, error: statesError } = await supabase
        .from("entities")
        .select("id, name, slug, active")
        .eq("entity_type", "state");

    if (statesError) {
        return NextResponse.json({ error: statesError.message }, {
            status: 500,
        });
    }

    const stateIds = (states ?? []).map((s) => s.id);
    const { data: geomRows, error: geomError } = stateIds.length
        ? await supabase
            .from("entity_geometries_geojson")
            .select("entity_id, geometry_type, geojson")
            .in("entity_id", stateIds)
            .eq("geometry_type", "boundary_simplified")
        : { data: [], error: null };

    if (geomError) {
        return NextResponse.json({ error: geomError.message }, { status: 500 });
    }

    const geoByEntityId = new Map<string, Geometry>();
    for (const row of geomRows ?? []) {
        if (row?.entity_id && isGeometry(row.geojson)) {
            geoByEntityId.set(row.entity_id, row.geojson);
        }
    }

    const { data: relRows, error: relError } = stateIds.length
        ? await supabase
            .from("entity_relationships")
            .select("parent_entity_id, child_entity_id")
            .in("parent_entity_id", stateIds)
            .eq("relationship_type", "contains")
        : { data: [], error: null };

    if (relError) {
        return NextResponse.json({ error: relError.message }, { status: 500 });
    }

    const childIds = (relRows ?? [])
        .map((row) => row.child_entity_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

    const { data: childEntities, error: childError } = childIds.length
        ? await supabase
            .from("entities")
            .select("id, entity_type")
            .in("id", childIds)
        : { data: [], error: null };

    if (childError) {
        return NextResponse.json({ error: childError.message }, {
            status: 500,
        });
    }

    const districtChildIds = new Set(
        (childEntities ?? [])
            .filter((c) => c.entity_type === "district")
            .map((c) => c.id),
    );

    const childCountByParent = new Map<string, number>();
    for (const row of relRows ?? []) {
        if (!districtChildIds.has(row.child_entity_id)) continue;
        const current = childCountByParent.get(row.parent_entity_id) ?? 0;
        childCountByParent.set(row.parent_entity_id, current + 1);
    }

    const features: EntityFeature[] = [];
    for (const state of states ?? []) {
        const geometry = geoByEntityId.get(state.id);
        if (!geometry) continue;
        if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
            continue;
        }
        const child_count = childCountByParent.get(state.id) ?? 0;
        const props: EntityMapProperties = {
            entity_id: state.id,
            entity_type: "state",
            name: state.name ?? null,
            slug: state.slug ?? null,
            active: state.active ?? true,
            child_count,
        };
        features.push({
            type: "Feature",
            id: state.id,
            properties: props,
            geometry,
        });
    }

    const featureCollection: EntityFeatureCollection = {
        type: "FeatureCollection",
        features,
    };

    return NextResponse.json({
        level: "states",
        featureCollection,
    });
}
