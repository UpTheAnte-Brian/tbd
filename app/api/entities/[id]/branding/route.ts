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
    const palettesByRole = {
      primary: summary.palettes.find((palette) => palette.role === "primary") ?? null,
      secondary: summary.palettes.find((palette) => palette.role === "secondary") ?? null,
      accent: summary.palettes.find((palette) => palette.role === "accent") ?? null,
    };
    return NextResponse.json({ ...summary, palettesByRole }, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Entity not found";
    const status = message.toLowerCase().includes("entity not found") ? 404 : 500;
    return jsonError(message, status);
  }
}
