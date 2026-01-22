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
  if (!Number.isFinite(parsed)) return null;
  if (parsed <= 0) return null;
  return parsed;
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
  const requestedGeometryType = searchParams.get("geometry_type") ||
    "boundary_simplified";
  const entityType = searchParams.get("entity_type") ?? undefined;
  const limitParam = parseLimitParam(searchParams.get("limit"));
  const offset = parseOffsetParam(searchParams.get("offset"));

  const requirePolygon = requestedGeometryType === "boundary" ||
    requestedGeometryType === "boundary_simplified";

  // If the caller did not specify a limit, we will auto-page up to a safe cap.
  // This prevents the common failure mode where the RPC default limit (often 60)
  // causes truncated child sets (e.g., MN should return 329 districts).
  const AUTO_PAGE = limitParam == null;
  const pageSize = entityType === "district" ? 400 : 200;
  const maxRows = entityType === "district" ? 2000 : 800;

  const runRpc = async (
    geometryType: string,
    pLimit: number | undefined,
    pOffset: number,
  ) => {
    return await supabase.rpc("map_children_geojson", {
      p_parent_entity_id: entityId,
      p_relationship_type: relationship,
      // Supabase generated types typically want string | undefined (not null)
      p_entity_type: entityType,
      p_geometry_type: geometryType,
      p_limit: pLimit,
      p_offset: pOffset,
    });
  };

  const collect = async (geometryType: string) => {
    const rows: MapChildrenRow[] = [];

    if (!AUTO_PAGE) {
      const { data, error } = await runRpc(
        geometryType,
        limitParam ?? undefined,
        offset,
      );
      if (error) return { rows: [] as MapChildrenRow[], error, geometryType };
      return {
        rows: (data ?? []) as MapChildrenRow[],
        error: null as any,
        geometryType,
      };
    }

    let currentOffset = offset;
    while (rows.length < maxRows) {
      const { data, error } = await runRpc(
        geometryType,
        pageSize,
        currentOffset,
      );
      if (error) return { rows: [] as MapChildrenRow[], error, geometryType };
      const batch = (data ?? []) as MapChildrenRow[];
      rows.push(...batch);
      if (batch.length < pageSize) break;
      currentOffset += pageSize;
    }

    return { rows, error: null as any, geometryType };
  };

  // 1) Try requested geometry type.
  let collected = await collect(requestedGeometryType);
  if (collected.error) {
    return NextResponse.json({ error: collected.error.message }, {
      status: 500,
    });
  }

  // 2) If caller asked for boundary_simplified but none exist, fall back to boundary.
  // Your TEST DB currently has boundary=329 and boundary_simplified=0 for MN districts.
  if (
    requestedGeometryType === "boundary_simplified" &&
    collected.rows.length === 0
  ) {
    const fallback = await collect("boundary");
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, {
        status: 500,
      });
    }
    collected = fallback;
  }

  const data = collected.rows;
  const geometryType = collected.geometryType;

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
    geometry_type: geometryType,
    returned_count: features.length,
    next_offset: !AUTO_PAGE && limitParam != null ? offset + limitParam : null,
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
