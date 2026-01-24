import "server-only";

import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
} from "geojson";

type GeojsonFeature = Feature<Geometry, GeoJsonProperties>;

type GeometryRow = {
  geojson: unknown | null;
};

type FeatureMeta = {
  entity_id?: string | null;
  entity_name?: string | null;
  entity_slug?: string | null;
  entity_type?: string | null;
};

const isGeometryObject = (value: unknown): value is Geometry => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { type?: unknown };
  return (
    typeof v.type === "string" &&
    v.type !== "Feature" &&
    v.type !== "FeatureCollection"
  );
};

const isFeature = (value: unknown): value is GeojsonFeature => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { type?: unknown; geometry?: unknown };
  return v.type === "Feature" && isGeometryObject(v.geometry);
};

const isFeatureCollection = (
  value: unknown
): value is FeatureCollection<Geometry, GeoJsonProperties> =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: string }).type === "FeatureCollection" &&
  Array.isArray((value as { features?: unknown }).features);

const normalizeGeojsonToFeatures = (value: unknown): GeojsonFeature[] => {
  if (isFeatureCollection(value)) {
    return value.features.filter(
      (feature): feature is GeojsonFeature => Boolean(feature)
    );
  }
  if (isFeature(value)) {
    return [value];
  }
  if (isGeometryObject(value)) {
    return [
      {
        type: "Feature",
        geometry: value,
        properties: {},
      },
    ];
  }
  return [];
};

const applyMetaToProperties = (
  properties: GeoJsonProperties | null | undefined,
  meta: FeatureMeta
): GeoJsonProperties => {
  const next = { ...(properties ?? {}) } as Record<string, unknown>;
  const maybeAssign = (
    key: keyof FeatureMeta,
    value: FeatureMeta[keyof FeatureMeta]
  ) => {
    if (!value) return;
    if (Object.prototype.hasOwnProperty.call(next, key)) return;
    next[key] = value;
  };

  maybeAssign("entity_id", meta.entity_id);
  maybeAssign("entity_name", meta.entity_name);
  maybeAssign("entity_slug", meta.entity_slug);
  maybeAssign("entity_type", meta.entity_type);

  return next as GeoJsonProperties;
};

type FeatureBuilderOptions<T extends GeometryRow> = {
  getMeta?: (row: T) => FeatureMeta;
  getFeatureId?: (
    feature: GeojsonFeature,
    row: T
  ) => GeojsonFeature["id"] | undefined;
};

export const buildFeatureCollectionFromGeometryRows = <T extends GeometryRow>(
  rows: T[],
  options: FeatureBuilderOptions<T> = {}
) => {
  const features: GeojsonFeature[] = [];

  for (const row of rows) {
    const meta = options.getMeta?.(row) ?? {};
    const rowFeatures = normalizeGeojsonToFeatures(row.geojson);
    for (const feature of rowFeatures) {
      if (!feature.geometry) continue;
      const properties = applyMetaToProperties(feature.properties, meta);
      const featureId = options.getFeatureId?.(feature, row);
      const id = feature.id ?? featureId ?? undefined;
      features.push({
        ...feature,
        id,
        properties,
      });
    }
  }

  const featureCollection: FeatureCollection<Geometry, GeoJsonProperties> = {
    type: "FeatureCollection",
    features,
  };

  return {
    featureCollection,
    returnedCount: features.length,
  };
};
