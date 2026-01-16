import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { Database } from "@/database.types";

export type GeometryFeatureCollection = FeatureCollection<
  Geometry,
  GeoJsonProperties
>;

export type EntityGeometryRow = Pick<
  Database["public"]["Tables"]["entity_geometries"]["Row"],
  | "id"
  | "entity_id"
  | "geometry_type"
  | "source"
  | "geojson"
  | "bbox"
  | "created_at"
  | "updated_at"
>;

const isFeatureCollection = (value: unknown): value is GeometryFeatureCollection =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: string }).type === "FeatureCollection" &&
  Array.isArray((value as { features?: unknown }).features);

const normalizeGeometryTypes = (geometryTypes: string[]) =>
  Array.from(
    new Set(geometryTypes.map((type) => type.trim()).filter(Boolean))
  );

export async function getEntityGeometryGeojson(
  supabase: SupabaseClient<Database>,
  entityId: string,
  geometryType: string
): Promise<GeometryFeatureCollection | null> {
  const { data, error } = await supabase
    .from("entity_geometries")
    .select("geojson")
    .eq("entity_id", entityId)
    .eq("geometry_type", geometryType)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch entity geometry: ${error.message}`);
  }

  if (!data?.geojson || !isFeatureCollection(data.geojson)) {
    return null;
  }

  return data.geojson;
}

export async function getEntityGeometryRows(
  supabase: SupabaseClient<Database>,
  entityId: string,
  geometryTypes: string[]
): Promise<EntityGeometryRow[]> {
  const normalizedTypes = normalizeGeometryTypes(geometryTypes);
  if (!normalizedTypes.length) return [];

  const { data, error } = await supabase
    .from("entity_geometries")
    .select(
      "id, entity_id, geometry_type, source, geojson, bbox, created_at, updated_at"
    )
    .eq("entity_id", entityId)
    .in("geometry_type", normalizedTypes);

  if (error) {
    throw new Error(`Failed to fetch entity geometries: ${error.message}`);
  }

  return (data ?? []) as EntityGeometryRow[];
}
