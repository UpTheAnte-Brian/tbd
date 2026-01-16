import { NextResponse } from "next/server";
import { resolveEntityId } from "@/app/lib/entities";
import {
  getChildGeometriesByRelationship,
  getEntityGeometries,
} from "@/app/lib/server/entity-geometry-queries";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

// GET /api/entities/[id]/geometries?types=boundary_simplified,district_attendance_areas
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: entityKey } = await context.params;
  const { searchParams } = new URL(req.url);
  const typeParams = searchParams
    .getAll("types")
    .flatMap((value) => value.split(","));
  const fallbackType = searchParams.get("type");
  const geometryTypes =
    typeParams.length > 0
      ? typeParams
      : fallbackType
      ? [fallbackType]
      : ["district_attendance_areas"];
  const relationshipType = searchParams.get("relationship_type") || null;
  const childEntityType = searchParams.get("child_entity_type") || null;
  const childGeometryType = searchParams.get("child_geometry_type") || null;
  const primaryOnlyParam = searchParams.get("primary_only");
  const primaryOnly =
    primaryOnlyParam === null
      ? false
      : primaryOnlyParam === "true" || primaryOnlyParam === "1";

  try {
    const entityId = await resolveEntityId(supabaseAdmin, entityKey);
    const geometries = childGeometryType
      ? await getChildGeometriesByRelationship(
          entityId,
          relationshipType ?? "contains",
          childEntityType,
          childGeometryType,
          primaryOnly
        )
      : await getEntityGeometries(entityId, geometryTypes);
    return NextResponse.json({ geometries });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load geometry";
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
