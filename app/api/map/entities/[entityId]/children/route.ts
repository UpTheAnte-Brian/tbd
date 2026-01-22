import { NextResponse } from "next/server";
import type { Geometry } from "geojson";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import type {
  EntityFeature,
  EntityFeatureCollection,
  EntityMapProperties,
} from "@/domain/map/types";

const isGeometry = (value: unknown): value is Geometry => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { type?: unknown };
  return typeof v.type === "string";
};

type MapChildrenRow = {
  entity_id: string | null;
  entity_type: string | null;
  name: string | null;
  slug: string | null;
  active: boolean | null;
  geojson: unknown | null;
};

const parseLimitParam = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseOffsetParam = (value: string | null): number => {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Perf note: initial MN load should use
 * `entity_type=district&relationship=contains&geometry_type=boundary_simplified&limit=400`.
 * Recommended MN limit is 400; use offset for paging.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ entityId: string }> },
) {
  const supabase = supabaseAdmin;
  const { entityId } = await context.params;
  const { searchParams } = new URL(req.url);
  const relationship = searchParams.get("relationship") || "contains";
  const geometryType = searchParams.get("geometry_type") ||
    "boundary_simplified";
  const entityType = searchParams.get("entity_type") ?? undefined;
  const limit = parseLimitParam(searchParams.get("limit"));
  const offset = parseOffsetParam(searchParams.get("offset"));
  const requirePolygon = geometryType === "boundary" ||
    geometryType === "boundary_simplified";

  const { data, error } = await supabase.rpc("map_children_geojson", {
    p_parent_entity_id: entityId,
    p_relationship_type: relationship,
    // Supabase generated types typically want string | undefined (not null)
    p_entity_type: entityType,
    p_geometry_type: geometryType,
    // Keep these undefined when omitted so the RPC can apply defaults
    p_limit: limit ?? undefined,
    p_offset: offset,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const features: EntityFeature[] = [];
  for (const row of (data ?? []) as MapChildrenRow[]) {
    if (!row.entity_id) continue;
    if (!isGeometry(row.geojson)) continue;
    const geometry = row.geojson;
    if (!geometry) continue;
    if (
      requirePolygon &&
      geometry.type !== "Polygon" &&
      geometry.type !== "MultiPolygon"
    ) {
      continue;
    }
    const props: EntityMapProperties = {
      entity_id: row.entity_id,
      entity_type: row.entity_type ?? "",
      slug: row.slug ?? null,
      name: row.name ?? null,
      active: row.active ?? true,
      child_count: 0,
    };
    features.push({
      type: "Feature",
      id: row.entity_id,
      properties: props,
      geometry,
    });
  }

  const featureCollection: EntityFeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  return NextResponse.json({
    parent_entity_id: entityId,
    relationship,
    featureCollection,
    schools_scanned: entityType === "school" && Array.isArray(data)
      ? data.length
      : null,
  }, {
    headers: {
      "Cache-Control":
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
