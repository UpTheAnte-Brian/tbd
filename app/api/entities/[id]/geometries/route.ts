import { NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import { getEntityGeometryGeojson } from "@/app/lib/server/entity-geometries";

// GET /api/entities/[id]/geometries?type=district_attendance_areas
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createApiClient();
  const { id: entityKey } = await context.params;
  const { searchParams } = new URL(req.url);
  const geometryType = searchParams.get("type") ?? "district_attendance_areas";

  try {
    const entityId = await resolveEntityId(supabase, entityKey);
    const geojson = await getEntityGeometryGeojson(
      supabase,
      entityId,
      geometryType
    );
    return NextResponse.json({ geojson });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load geometry";
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
