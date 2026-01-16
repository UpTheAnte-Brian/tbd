import "server-only";

import type { Database } from "@/database.types";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

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
> & {
  entity_name?: string | null;
  entity_slug?: string | null;
};

const normalizeGeometryTypes = (geometryTypes: string[]) =>
  Array.from(
    new Set(geometryTypes.map((type) => type.trim()).filter(Boolean))
  );

export async function getEntityGeometries(
  entityId: string,
  geometryTypes: string[]
): Promise<EntityGeometryRow[]> {
  const normalizedTypes = normalizeGeometryTypes(geometryTypes);
  if (!normalizedTypes.length) return [];

  const { data, error } = await supabaseAdmin
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

export async function getChildGeometriesByRelationship(
  parentId: string,
  relationshipType: string,
  childEntityType: string | null,
  geometryType: string,
  primaryOnly = false
): Promise<EntityGeometryRow[]> {
  let relationshipQuery = supabaseAdmin
    .from("entity_relationships")
    .select("child_entity_id, is_primary")
    .eq("parent_entity_id", parentId)
    .eq("relationship_type", relationshipType);

  if (primaryOnly) {
    relationshipQuery = relationshipQuery.eq("is_primary", true);
  }

  const { data: relationships, error: relationshipError } =
    await relationshipQuery;

  if (relationshipError) {
    throw new Error(
      `Failed to fetch related entities: ${relationshipError.message}`
    );
  }

  const childIds = Array.from(
    new Set((relationships ?? []).map((row) => row.child_entity_id))
  );

  if (!childIds.length) return [];

  let entityQuery = supabaseAdmin
    .from("entities")
    .select("id, name, slug, entity_type")
    .in("id", childIds);

  if (childEntityType) {
    entityQuery = entityQuery.eq("entity_type", childEntityType);
  }

  const { data: childEntities, error: entitiesError } = await entityQuery;

  if (entitiesError) {
    throw new Error(
      `Failed to fetch related entity details: ${entitiesError.message}`
    );
  }

  const filteredIds = (childEntities ?? []).map((row) => row.id);
  if (!filteredIds.length) return [];

  const entityMap = new Map(
    (childEntities ?? []).map((row) => [
      row.id,
      { name: row.name, slug: row.slug },
    ])
  );

  const { data: geometries, error: geometryError } = await supabaseAdmin
    .from("entity_geometries")
    .select(
      "id, entity_id, geometry_type, source, geojson, bbox, created_at, updated_at"
    )
    .in("entity_id", filteredIds)
    .eq("geometry_type", geometryType);

  if (geometryError) {
    throw new Error(
      `Failed to fetch related geometries: ${geometryError.message}`
    );
  }

  return (geometries ?? []).map((row) => {
    const entityMeta = entityMap.get(row.entity_id);
    return {
      ...(row as EntityGeometryRow),
      entity_name: entityMeta?.name ?? null,
      entity_slug: entityMeta?.slug ?? null,
    };
  });
}
