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

const BATCH_SIZE = 200;
const REL_BATCH_SIZE = 1000;

const isGeometry = (value: unknown): value is Geometry => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { type?: unknown };
  return typeof v.type === "string";
};

type ChildEntityRow = {
  id: string;
  name: string | null;
  slug: string | null;
  active: boolean | null;
  entity_type: string | null;
};

type GeometryRow = {
  entity_id: string | null;
  geometry_type: string | null;
  geojson: unknown | null;
};

export async function GET(
  req: Request,
  context: { params: Promise<{ entityId: string }> },
) {
  const supabase = supabaseAdmin;
  const { entityId } = await context.params;
  const { searchParams } = new URL(req.url);
  const relationship = searchParams.get("relationship") ?? "contains";
  const geometryType = searchParams.get("geometry_type") ??
    "boundary_simplified";
  const entityType = searchParams.get("entity_type");
  const requirePolygon = geometryType === "boundary" ||
    geometryType === "boundary_simplified";

  const relRows: { child_entity_id: string | null }[] = [];
  let relError: { message: string } | null = null;
  let relOffset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("entity_relationships")
      .select("child_entity_id")
      .eq("parent_entity_id", entityId)
      .eq("relationship_type", relationship)
      .order("child_entity_id", { ascending: true })
      .range(relOffset, relOffset + REL_BATCH_SIZE - 1);

    if (error) {
      relError = error;
      break;
    }

    relRows.push(...(data ?? []));
    if (!data || data.length < REL_BATCH_SIZE) break;
    relOffset += REL_BATCH_SIZE;
  }

  if (relError) {
    return NextResponse.json({ error: relError.message }, { status: 500 });
  }

  const childIds = sanitizeIds(
    (relRows ?? []).map((row) => row.child_entity_id),
  );

  if (!childIds.length) {
    const emptyCollection: EntityFeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    return NextResponse.json({
      parent_entity_id: entityId,
      relationship,
      featureCollection: emptyCollection,
      schools_scanned: entityType === "school" ? 0 : null,
    });
  }

  const { data: childEntities, error: childError } = await (async () => {
    const rows: ChildEntityRow[] = [];
    for (const batch of chunk(childIds, BATCH_SIZE)) {
      let query = supabase
        .from("entities")
        .select("id, name, slug, active, entity_type")
        .in("id", batch);

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };
      rows.push(...(data ?? []));
    }
    return { data: rows, error: null };
  })();

  if (childError) {
    return NextResponse.json({ error: childError.message }, { status: 500 });
  }

  const childEntityIds = sanitizeIds(
    (childEntities ?? []).map((row) => row.id),
  );

  const { data: geomRows, error: geomError } = childEntityIds.length
    ? await (async () => {
      const rows: GeometryRow[] = [];
      for (const batch of chunk(childEntityIds, BATCH_SIZE)) {
        const { data, error } = await supabase
          .from("entity_geometries_geojson")
          .select("entity_id, geometry_type, geojson")
          .in("entity_id", batch)
          .eq("geometry_type", geometryType);

        if (error) return { data: null, error };
        rows.push(...(data ?? []));
      }
      return { data: rows, error: null };
    })()
    : { data: [], error: null };

  if (geomError) {
    return NextResponse.json({ error: geomError.message }, { status: 500 });
  }

  const geoByEntityId = new Map<string, Geometry>();
  for (const g of geomRows ?? []) {
    if (g?.entity_id && isGeometry(g.geojson)) {
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
    schools_scanned: entityType === "school"
      ? (childEntities?.length ?? 0)
      : null,
  });
}
