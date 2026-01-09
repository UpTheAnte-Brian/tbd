import { NextResponse } from "next/server";
import {
  getServerClient,
  jsonError,
  parseEntityId,
} from "@/app/lib/server/route-context";
import { getEntityBrandingSummary } from "@/app/lib/server/entities";

// GET /api/entities/[id]/branding
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await getServerClient();

  try {
    const entityId = await parseEntityId(supabase, context.params);
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
    return jsonError(message, status);
  }
}
