import { NextResponse } from "next/server";
import type { Geometry } from "geojson";
import { supabaseAdmin } from "@/utils/supabase/service-worker";
import type {
  EntityFeature,
  EntityFeatureCollection,
  EntityMapProperties,
} from "@/domain/map/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const sanitizeIds = (ids: unknown[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of ids) {
    if (typeof v !== "string") continue;
    const id = v.trim();
    if (!id || !UUID_RE.test(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

const isGeometry = (value: unknown): value is Geometry => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { type?: unknown };
  return typeof v.type === "string";
};

type RelationshipRow = {
  parent_entity_id: string | null;
  child_entity_id: string | null;
};

type EntityRow = {
  id: string;
  entity_type: string | null;
  name: string | null;
  slug: string | null;
  active: boolean | null;
};

type GeometryRow = {
  entity_id: string | null;
  geometry_type: string | null;
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

// Paging/batching constants
const ENTITY_BATCH_SIZE = 500;
const GEOM_BATCH_SIZE = 250;

/**
 * Reads children directly from tables (no RPC) and returns a GeoJSON FeatureCollection.
 *
 * Recommended MN initial load:
 * `relationship=contains&entity_type=district&geometry_type=boundary`
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ entityId: string }> },
) {
  const supabase = supabaseAdmin;
  const { entityId } = await context.params;
  const { searchParams } = new URL(req.url);

  const relationship = searchParams.get("relationship") || "contains";
  const geometryType = searchParams.get("geometry_type") || "boundary";
  const entityType = searchParams.get("entity_type") ?? null;
  const limitParam = parseLimitParam(searchParams.get("limit"));
  const offsetParam = parseOffsetParam(searchParams.get("offset"));

  const requirePolygon = geometryType === "boundary";

  // If caller did not specify a limit, auto-page up to a safe cap.
  // This prevents truncated results from PostgREST defaults.
  const AUTO_PAGE = limitParam == null;
  const pageSize = entityType === "district" ? 400 : 200;
  const maxRows = entityType === "district" ? 2000 : 800;

  const fetchChildIds = async (pOffset: number, pLimit: number) => {
    const { data, error } = await supabase
      .from("entity_relationships")
      .select("parent_entity_id, child_entity_id")
      .eq("parent_entity_id", entityId)
      .eq("relationship_type", relationship)
      .order("child_entity_id", { ascending: true })
      .range(pOffset, pOffset + pLimit - 1);

    if (error) return { data: null as RelationshipRow[] | null, error };
    return { data: (data ?? []) as RelationshipRow[], error: null };
  };

  const collectChildIds = async (): Promise<
    {
      childIds: string[];
      nextOffset: number | null;
    } | { error: string }
  > => {
    const out: string[] = [];

    if (!AUTO_PAGE) {
      const { data, error } = await fetchChildIds(
        offsetParam,
        limitParam ?? 200,
      );
      if (error) return { error: error.message };
      const ids = sanitizeIds((data ?? []).map((r) => r.child_entity_id));
      const nextOffset =
        (limitParam ?? 0) > 0 && ids.length === (limitParam ?? 0)
          ? offsetParam + (limitParam ?? 0)
          : null;
      return { childIds: ids, nextOffset };
    }

    let currentOffset = offsetParam;
    while (out.length < maxRows) {
      const { data, error } = await fetchChildIds(currentOffset, pageSize);
      if (error) return { error: error.message };
      const ids = sanitizeIds((data ?? []).map((r) => r.child_entity_id));
      out.push(...ids);
      if (ids.length < pageSize) break;
      currentOffset += pageSize;
    }

    return { childIds: out, nextOffset: null };
  };

  const collectedIds = await collectChildIds();
  if ("error" in collectedIds) {
    return NextResponse.json({ error: collectedIds.error }, { status: 500 });
  }

  const { childIds, nextOffset } = collectedIds;

  // Fetch entity rows for children (so we can filter by entity_type and include props)
  const entityById = new Map<string, EntityRow>();
  if (childIds.length) {
    for (const batch of chunk(childIds, ENTITY_BATCH_SIZE)) {
      const { data, error } = await supabase
        .from("entities")
        .select("id, entity_type, name, slug, active")
        .in("id", batch);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      for (const row of (data ?? []) as EntityRow[]) {
        entityById.set(row.id, row);
      }
    }
  }

  const filteredEntityIds = entityType
    ? childIds.filter((id) => entityById.get(id)?.entity_type === entityType)
    : childIds;

  const fetchGeometries = async (geometryType: string) => {
    const geoById = new Map<string, Geometry>();
    if (!filteredEntityIds.length) return geoById;

    for (const batch of chunk(filteredEntityIds, GEOM_BATCH_SIZE)) {
      const { data, error } = await supabase
        .from("entity_geometries")
        .select("entity_id, geometry_type, geojson")
        .in("entity_id", batch)
        .eq("geometry_type", geometryType);

      if (error) throw new Error(error.message);
      for (const row of (data ?? []) as GeometryRow[]) {
        if (row?.entity_id && isGeometry(row.geojson)) {
          geoById.set(row.entity_id, row.geojson);
        }
      }
    }

    return geoById;
  };

  let geoByEntityId: Map<string, Geometry>;

  try {
    geoByEntityId = await fetchGeometries(geometryType);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const features: EntityFeature[] = [];
  for (const id of filteredEntityIds) {
    const geometry = geoByEntityId.get(id);
    if (!geometry) continue;
    if (
      requirePolygon &&
      geometry.type !== "Polygon" &&
      geometry.type !== "MultiPolygon"
    ) {
      continue;
    }

    const ent = entityById.get(id);
    const props: EntityMapProperties = {
      entity_id: id,
      entity_type: ent?.entity_type ?? "",
      slug: ent?.slug ?? null,
      name: ent?.name ?? null,
      active: ent?.active ?? true,
      child_count: 0,
    };

    features.push({
      type: "Feature",
      id,
      properties: props,
      geometry,
    });
  }

  const featureCollection: EntityFeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  return NextResponse.json(
    {
      parent_entity_id: entityId,
      relationship,
      geometry_type: geometryType,
      returned_count: features.length,
      next_offset: nextOffset,
      featureCollection,
      schools_scanned: entityType === "school" ? features.length : null,
    },
    {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
