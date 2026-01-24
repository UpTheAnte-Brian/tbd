import { NextResponse } from "next/server";
import type { Geometry } from "geojson";
import type {
  EntityFeature,
  EntityFeatureCollection,
  EntityMapProperties,
} from "@/domain/map/types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

const isGeometryObject = (value: unknown): value is Geometry => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { type?: unknown };
  return typeof v.type === "string";
};

const normalizeToGeometry = (value: unknown): Geometry | null => {
  // The `geojson` column may contain:
  // - a bare Geometry
  // - a Feature (with a `geometry`)
  // - a FeatureCollection (common in your dataset for boundaries)
  // We normalize all of these down to a single Geometry.

  if (typeof value !== "object" || value === null) return null;

  const v = value as {
    type?: unknown;
    geometry?: unknown;
    features?: unknown;
  };

  // Bare geometry: { type: "Polygon" | "MultiPolygon" | ... }
  if (
    typeof v.type === "string" &&
    v.type !== "Feature" &&
    v.type !== "FeatureCollection"
  ) {
    return isGeometryObject(value) ? (value as Geometry) : null;
  }

  // Feature: { type: "Feature", geometry: { ... } }
  if (v.type === "Feature" && v.geometry && typeof v.geometry === "object") {
    return isGeometryObject(v.geometry) ? (v.geometry as Geometry) : null;
  }

  // FeatureCollection: { type: "FeatureCollection", features: [{ type: "Feature", geometry: {...} }, ...] }
  if (v.type === "FeatureCollection" && Array.isArray(v.features)) {
    for (const f of v.features as unknown[]) {
      if (typeof f !== "object" || f === null) continue;
      const feature = f as { type?: unknown; geometry?: unknown };
      if (feature.type !== "Feature") continue;
      if (!feature.geometry || typeof feature.geometry !== "object") continue;
      if (isGeometryObject(feature.geometry)) {
        return feature.geometry as Geometry;
      }
    }
  }

  return null;
};

const normalizeEntityRow = (
  value: EntityWithGeometryRow | EntityWithGeometryRow[] | null,
): EntityWithGeometryRow | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
};

type EntityRow = {
  id: string;
  entity_type: string | null;
  name: string | null;
  slug: string | null;
  active: boolean | null;
};

type EntityGeometryRow = {
  geometry_type: string | null;
  geojson: unknown | null;
};

type EntityWithGeometryRow = EntityRow & {
  entity_geometries?: EntityGeometryRow[] | EntityGeometryRow | null;
};

type RelationshipEntityRow = {
  child_entity_id: string | null;
  entities: EntityWithGeometryRow | EntityWithGeometryRow[] | null;
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
 * Reads children directly from tables and returns a GeoJSON FeatureCollection.
 *
 * REQUIRED usage:
 * - entity_type is mandatory
 * - geometry_type is mandatory
 *
 * Examples:
 * MN -> districts:
 *   relationship=contains&entity_type=district&geometry_type=boundary
 *
 * District -> schools:
 *   relationship=contains&entity_type=school&geometry_type=point
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await context.params;
  const { searchParams } = new URL(req.url);

  const relationship = searchParams.get("relationship") || "contains";
  const requestedGeometryType = searchParams.get("geometry_type");
  const entityType = searchParams.get("entity_type");
  const debug = searchParams.get("debug") === "1";
  const limitParam = parseLimitParam(searchParams.get("limit"));
  const offsetParam = parseOffsetParam(searchParams.get("offset"));

  if (!entityType) {
    return NextResponse.json(
      { error: "entity_type is required for children queries" },
      { status: 400 },
    );
  }

  if (!requestedGeometryType) {
    return NextResponse.json(
      { error: "geometry_type is required" },
      { status: 400 },
    );
  }

  const requirePolygon = requestedGeometryType === "boundary";
  const effectiveEntityType = entityType;

  const pageSize = limitParam ?? 400;

  const supabaseUrlUsed = process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  let supabaseUrlHost: string | null = null;
  if (supabaseUrlUsed) {
    try {
      supabaseUrlHost = new URL(supabaseUrlUsed).host;
    } catch {
      supabaseUrlHost = null;
    }
  }

  const supabase = supabaseAdmin;

  if (debug) {
    console.log("children route debug", {
      entityId,
      relationship,
      entityType,
      requestedGeometryType,
      supabase_url_host: supabaseUrlHost,
    });
  }

  const stringifySupabaseError = (error: unknown): string => {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  };

  const respondWithError = (
    step: string,
    details: Record<string, unknown>,
    error: unknown,
  ) => {
    const payload: Record<string, unknown> = {
      step,
      entityId,
      relationship,
      requestedGeometryType,
      effectiveEntityType,
      requested_entity_type: entityType,
      requested_geometry_type: requestedGeometryType,
      page_size: pageSize,
      ...details,
      supabase_error: stringifySupabaseError(error),
    };
    if (debug) {
      payload.supabase_url_used = supabaseUrlUsed;
      payload.supabase_url_host = supabaseUrlHost;
    }
    console.error("children route error", payload);

    if (debug) {
      return NextResponse.json(payload, { status: 500 });
    }

    const message = error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "Unknown error")
      : typeof error === "string"
      ? error
      : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  };

  const geometryType = requestedGeometryType;
  const rangeStart = offsetParam;
  const rangeEnd = rangeStart + pageSize - 1;

  const childQuery = supabase
    .from("entity_relationships")
    .select(
      `
        child_entity_id,
        entities:entities!entity_relationships_child_entity_id_fkey!inner (
          id, entity_type, name, slug, active,
          entity_geometries!inner (
            geometry_type, geojson
          )
        )
      `,
    )
    .eq("parent_entity_id", entityId)
    .eq("relationship_type", relationship)
    .eq("entities.entity_type", effectiveEntityType)
    .eq("entities.entity_geometries.geometry_type", geometryType)
    .order("slug", {
      ascending: true,
      foreignTable: "entities",
      nullsFirst: false,
    })
    .order("id", { ascending: true, foreignTable: "entities" })
    .range(rangeStart, rangeEnd);

  const { data, error } = await childQuery;
  if (error) {
    return respondWithError(
      "fetchChildren",
      {
        offset: rangeStart,
        limit: pageSize,
        geometryType,
        effectiveEntityType,
      },
      error,
    );
  }

  const rows = (data ?? []) as RelationshipEntityRow[];

  const features: EntityFeature[] = [];
  for (const row of rows) {
    const entity = normalizeEntityRow(row.entities);
    if (!entity) continue;

    const id = entity.id ?? row.child_entity_id;
    if (!id) continue;

    const geometryRows = Array.isArray(entity.entity_geometries)
      ? entity.entity_geometries
      : entity.entity_geometries
      ? [entity.entity_geometries]
      : [];

    let geometry: Geometry | null = null;
    for (const geoRow of geometryRows) {
      geometry = normalizeToGeometry(geoRow?.geojson);
      if (geometry) break;
    }
    if (!geometry) continue;
    if (
      requirePolygon &&
      geometry.type !== "Polygon" &&
      geometry.type !== "MultiPolygon"
    ) {
      continue;
    }

    const props: EntityMapProperties = {
      entity_id: id,
      entity_type: entity.entity_type ?? "",
      slug: entity.slug ?? null,
      name: entity.name ?? null,
      active: entity.active ?? true,
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

  if (process.env.NODE_ENV === "development") {
    console.log("map children", {
      parent_entity_id: entityId,
      entity_type: effectiveEntityType,
      geometry_type: requestedGeometryType,
      returned_count: features.length,
    });
  }

  // Keep this route's response shape aligned with `/api/map/home` so the UI
  // can treat all map layers the same.
  //
  // NOTE: We intentionally do NOT include the slower/secondary geometries
  // (e.g. district_attendance_areas, school_program_locations) in this call.
  return NextResponse.json(
    {
      level: effectiveEntityType === "district"
        ? "districts"
        : effectiveEntityType,
      featureCollection,
      parent_entity_id: entityId,
      relationship,
      entity_type: effectiveEntityType,
      geometry_type: requestedGeometryType,
      returned_count: features.length,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    },
  );
}
