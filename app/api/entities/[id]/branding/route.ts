import { NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import { getEntityBrandingSummary } from "@/app/lib/server/entities";

// GET /api/entities/[id]/branding
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createApiClient();
  const { id: entityKey } = await context.params;

  try {
    const entityId = await resolveEntityId(supabase, entityKey);
    const summary = await getEntityBrandingSummary(supabase, entityId);
    return NextResponse.json(summary, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Entity not found";
    const status = message.toLowerCase().includes("entity not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
