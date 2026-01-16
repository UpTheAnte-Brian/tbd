import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

export type EntityGeometryRow = {
  id: string;
  entity_id: string;
  geometry_type: string;
  source: string | null;
  geojson: FeatureCollection<Geometry, GeoJsonProperties> | null;
  bbox: unknown | null;
  created_at?: string | null;
  updated_at?: string | null;
  entity_name?: string | null;
  entity_slug?: string | null;
};

export type EntityGeometriesByType = Record<string, EntityGeometryRow[]>;

type FetchOptions = {
  signal?: AbortSignal;
};

const isFeatureCollection = (
  value: unknown
): value is FeatureCollection<Geometry, GeoJsonProperties> =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: string }).type === "FeatureCollection" &&
  Array.isArray((value as { features?: unknown }).features);

const coerceString = (value: unknown) =>
  typeof value === "string" ? value : null;

const coerceEntityGeometryRow = (value: unknown): EntityGeometryRow | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = coerceString(record.id);
  const entityId = coerceString(record.entity_id);
  const geometryType = coerceString(record.geometry_type);

  if (!id || !entityId || !geometryType) return null;

  return {
    id,
    entity_id: entityId,
    geometry_type: geometryType,
    source: coerceString(record.source),
    geojson: isFeatureCollection(record.geojson) ? record.geojson : null,
    bbox: (record.bbox as unknown) ?? null,
    created_at: coerceString(record.created_at),
    updated_at: coerceString(record.updated_at),
    entity_name: coerceString(record.entity_name),
    entity_slug: coerceString(record.entity_slug),
  };
};

export async function fetchEntityGeometries(
  entityId: string,
  geometryTypes: string[],
  options: FetchOptions = {}
): Promise<EntityGeometriesByType> {
  const params = new URLSearchParams();
  if (geometryTypes.length) {
    params.set("types", geometryTypes.join(","));
  }
  const url = `/api/entities/${entityId}/geometries${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: options.signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body?.error === "string"
        ? body.error
        : "Failed to load entity geometries";
    throw new Error(message);
  }

  const data = (await res.json()) as {
    geometries?: unknown;
  };
  const rawRows = Array.isArray(data.geometries) ? data.geometries : [];
  const rows = rawRows
    .map(coerceEntityGeometryRow)
    .filter((row): row is EntityGeometryRow => Boolean(row));

  const byType: EntityGeometriesByType = {};
  for (const row of rows) {
    if (!byType[row.geometry_type]) {
      byType[row.geometry_type] = [];
    }
    byType[row.geometry_type].push(row);
  }

  return byType;
}

type ChildGeometryOptions = {
  relationshipType: string;
  childEntityType?: string;
  childGeometryType: string;
  primaryOnly?: boolean;
};

export async function fetchChildGeometriesByRelationship(
  entityId: string,
  options: ChildGeometryOptions,
  fetchOptions: FetchOptions = {}
): Promise<EntityGeometriesByType> {
  const params = new URLSearchParams();
  params.set("relationship_type", options.relationshipType);
  params.set("child_geometry_type", options.childGeometryType);
  if (options.childEntityType) {
    params.set("child_entity_type", options.childEntityType);
  }
  if (options.primaryOnly !== undefined) {
    params.set("primary_only", options.primaryOnly ? "true" : "false");
  }
  const url = `/api/entities/${entityId}/geometries?${params.toString()}`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: fetchOptions.signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body?.error === "string"
        ? body.error
        : "Failed to load related geometries";
    throw new Error(message);
  }

  const data = (await res.json()) as {
    geometries?: unknown;
  };
  const rawRows = Array.isArray(data.geometries) ? data.geometries : [];
  const rows = rawRows
    .map(coerceEntityGeometryRow)
    .filter((row): row is EntityGeometryRow => Boolean(row));

  const byType: EntityGeometriesByType = {};
  for (const row of rows) {
    if (!byType[row.geometry_type]) {
      byType[row.geometry_type] = [];
    }
    byType[row.geometry_type].push(row);
  }

  return byType;
}
