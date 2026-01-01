import { NextResponse } from "next/server";
import type { Geometry } from "geojson";
import { createApiClient } from "@/utils/supabase/route";
import type {
  EntityFeature,
  EntityFeatureCollection,
  EntityMapProperties,
} from "@/app/lib/types/map";

export async function GET(
  req: Request,
  context: { params: Promise<{ entityId: string }> }
) {
  const supabase = await createApiClient();
  const { entityId } = await context.params;
  const { searchParams } = new URL(req.url);
  const relationship = searchParams.get("relationship") ?? "contains";
  const geometryType = searchParams.get("geometry_type") ??
    "boundary_simplified";
  const requirePolygon =
    geometryType === "boundary" || geometryType === "boundary_simplified";

  const { data: relRows, error: relError } = await supabase
    .from("entity_relationships")
    .select("child_entity_id")
    .eq("parent_entity_id", entityId)
    .eq("relationship_type", relationship);

  if (relError) {
    return NextResponse.json({ error: relError.message }, { status: 500 });
  }

  const childIds = (relRows ?? [])
    .map((row) => row.child_entity_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (!childIds.length) {
  const emptyCollection: EntityFeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    return NextResponse.json({
      parent_entity_id: entityId,
      relationship,
      featureCollection: emptyCollection,
    });
  }

  const { data: childEntities, error: childError } = await supabase
    .from("entities")
    .select("id, name, slug, active, entity_type")
    .in("id", childIds);

  if (childError) {
    return NextResponse.json({ error: childError.message }, { status: 500 });
  }

  const childEntityIds = (childEntities ?? [])
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const { data: geomRows, error: geomError } = await supabase
    .from("entity_geometries_geojson")
    .select("entity_id, geometry_type, geojson")
    .in("entity_id", childEntityIds)
    .eq("geometry_type", geometryType);

  if (geomError) {
    return NextResponse.json({ error: geomError.message }, { status: 500 });
  }

  const geoByEntityId = new Map<string, Geometry>();
  for (const g of geomRows ?? []) {
    if (g?.entity_id && g?.geojson) {
      geoByEntityId.set(g.entity_id, g.geojson);
    }
  }

  const features: EntityFeature[] = [];
  for (const row of childEntities ?? []) {
    const geometry = geoByEntityId.get(row.id);
    if (!geometry) continue;
    if (
      requirePolygon &&
      geometry.type !== "Polygon" &&
      geometry.type !== "MultiPolygon"
    ) {
      continue;
    }
    const props: EntityMapProperties = {
      entity_id: row.id,
      entity_type: row.entity_type ?? "",
      slug: row.slug ?? null,
      name: row.name ?? null,
      active: row.active ?? true,
      child_count: 0,
    };
    features.push({
      type: "Feature",
      id: row.id,
      properties: props,
      geometry,
    });
  }

  return NextResponse.json({
    parent_entity_id: entityId,
    relationship,
    featureCollection: {
      type: "FeatureCollection",
      features,
    },
  });
}
