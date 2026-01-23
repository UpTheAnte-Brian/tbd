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

const isGeometry = (value: unknown): value is Geometry =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof (value as { type?: unknown }).type === "string";

type GeometryRow = {
  entity_id: string | null;
  geometry_type: string | null;
  geojson: unknown | null;
};

type ChildEntityRow = {
  id: string;
  entity_type: string | null;
};

const BATCH_SIZE = 200;

export const revalidate = 86400;
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseAdmin;
  const { data: states, error: statesError } = await supabase
    .from("entities")
    .select("id, name, slug, active")
    .eq("entity_type", "state");

  if (statesError) {
    return NextResponse.json({ error: statesError.message }, { status: 500 });
  }

  const stateIds = sanitizeIds((states ?? []).map((s) => s.id));
  const { data: geomRows, error: geomError } = stateIds.length
    ? await (async () => {
      const rows: GeometryRow[] = [];
      for (const batch of chunk(stateIds, BATCH_SIZE)) {
        const { data, error } = await supabase
          .from("entity_geometries")
          .select("entity_id, geometry_type, geojson")
          .in("entity_id", batch)
          .eq("geometry_type", "boundary");

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

  const childIds = sanitizeIds(
    (relRows ?? []).map((row) => row.child_entity_id),
  );

  const { data: childEntities, error: childError } = childIds.length
    ? await (async () => {
      const rows: ChildEntityRow[] = [];
      for (const batch of chunk(childIds, BATCH_SIZE)) {
        const { data, error } = await supabase
          .from("entities")
          .select("id, entity_type")
          .in("id", batch);

        if (error) return { data: null, error };
        rows.push(...(data ?? []));
      }
      return { data: rows, error: null };
    })()
    : { data: [], error: null };

  if (childError) {
    return NextResponse.json({ error: childError.message }, { status: 500 });
  }

  const districtChildIds = new Set(
    (childEntities ?? [])
      .filter((c) => c.entity_type === "district")
      .map((c) => c.id),
  );

  const childCountByParent = new Map<string, number>();
  for (const row of relRows ?? []) {
    if (
      !row.parent_entity_id || !districtChildIds.has(row.child_entity_id ?? "")
    ) {
      continue;
    }
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
