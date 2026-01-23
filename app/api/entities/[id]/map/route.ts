import { NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import { getEntityMapFeatureCollection } from "@/app/lib/server/entities";

// GET /api/entities/[id]/map?geometry_type=boundary
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createApiClient();
  const { id: entityKey } = await context.params;
  const { searchParams } = new URL(req.url);
  const geometryType = searchParams.get("geometry_type") ?? "boundary";

  try {
    const entityId = await resolveEntityId(supabase, entityKey);
    const featureCollection = await getEntityMapFeatureCollection(
      supabase,
      entityId,
      geometryType
    );
    return NextResponse.json(featureCollection);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load entity map";
    const status = message.toLowerCase().includes("entity not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
