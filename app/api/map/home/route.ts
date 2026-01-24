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

const isGeometryObject = (value: unknown): value is Geometry => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { type?: unknown };
  return typeof v.type === "string";
};

const normalizeToGeometry = (value: unknown): Geometry | null => {
  if (typeof value !== "object" || value === null) return null;

  const v = value as { type?: unknown; geometry?: unknown };

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

  return null;
};

type GeometryRow = {
  entity_id: string | null;
  geometry_type: string | null;
  geojson: unknown | null;
};

const BATCH_SIZE = 200;

export const dynamic = "force-dynamic";

export async function GET() {
  const requestStart = Date.now();
  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `map-home-${requestStart}`;
  const supabase = supabaseAdmin;
  const statesStart = Date.now();
  const { data: states, error: statesError } = await supabase
    .from("entities")
    .select("id, name, slug, active")
    .eq("entity_type", "state");
  const statesMs = Date.now() - statesStart;

  if (statesError) {
    console.error("map home error", {
      request_id: requestId,
      step: "fetch_states",
      duration_ms: Date.now() - requestStart,
      query_ms: statesMs,
      error: statesError.message,
    });
    return NextResponse.json({ error: statesError.message }, { status: 500 });
  }

  const stateIds = sanitizeIds((states ?? []).map((s) => s.id));
  const geometryStart = Date.now();
  const { data: geomRows, error: geomError } = stateIds.length
    ? await (async () => {
      const rows: GeometryRow[] = [];
      let batches = 0;
      for (const batch of chunk(stateIds, BATCH_SIZE)) {
        batches += 1;
        const { data, error } = await supabase
          .from("entity_geometries")
          .select("entity_id, geometry_type, geojson")
          .in("entity_id", batch)
          .eq("geometry_type", "boundary");

        if (error) return { data: null, error };
        rows.push(...(data ?? []));
      }
      return { data: rows, error: null, batches };
    })()
    : { data: [], error: null, batches: 0 };
  const geometryMs = Date.now() - geometryStart;

  if (geomError) {
    console.error("map home error", {
      request_id: requestId,
      step: "fetch_geometries",
      duration_ms: Date.now() - requestStart,
      query_ms: geometryMs,
      state_ids: stateIds.length,
      error: geomError.message,
    });
    return NextResponse.json({ error: geomError.message }, { status: 500 });
  }

  const normalizeStart = Date.now();
  const geoByEntityId = new Map<string, Geometry>();
  for (const row of geomRows ?? []) {
    if (!row?.entity_id) continue;
    const geom = normalizeToGeometry(row.geojson);
    if (geom) geoByEntityId.set(row.entity_id, geom);
  }
  const normalizeMs = Date.now() - normalizeStart;

  const featureStart = Date.now();
  const features: EntityFeature[] = [];
  for (const state of states ?? []) {
    const geometry = geoByEntityId.get(state.id);
    if (!geometry) continue;
    if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
      continue;
    }
    const props: EntityMapProperties = {
      entity_id: state.id,
      entity_type: "state",
      name: state.name ?? null,
      slug: state.slug ?? null,
      active: state.active ?? true,
      child_count: 0,
    };
    features.push({
      type: "Feature",
      id: state.id,
      properties: props,
      geometry,
    });
  }
  const featureMs = Date.now() - featureStart;

  const featureCollection: EntityFeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  console.log("map home timing", {
    request_id: requestId,
    duration_ms: Date.now() - requestStart,
    states_ms: statesMs,
    geometries_ms: geometryMs,
    normalize_ms: normalizeMs,
    feature_ms: featureMs,
    states_count: states?.length ?? 0,
    state_ids: stateIds.length,
    geometry_rows: geomRows?.length ?? 0,
    features: features.length,
    batch_size: BATCH_SIZE,
    batches: geomRows ? Math.ceil(stateIds.length / BATCH_SIZE) : 0,
  });

  return NextResponse.json(
    {
      level: "states",
      featureCollection,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=600",
      },
    }
  );
}
