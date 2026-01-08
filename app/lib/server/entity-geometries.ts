import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { Database } from "@/database.types";

export type GeometryFeatureCollection = FeatureCollection<
  Geometry,
  GeoJsonProperties
>;

const isFeatureCollection = (value: unknown): value is GeometryFeatureCollection =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: string }).type === "FeatureCollection" &&
  Array.isArray((value as { features?: unknown }).features);

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
