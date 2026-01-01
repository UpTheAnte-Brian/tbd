import { NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import { getEntityById } from "@/app/lib/server/entities";

// GET /api/entities/[id]
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createApiClient();
  const { id } = await context.params;

  let entityId = id;
  try {
    entityId = await resolveEntityId(supabase, id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Entity not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  try {
    const entity = await getEntityById(supabase, entityId);
    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }
    return NextResponse.json(entity);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load entity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
