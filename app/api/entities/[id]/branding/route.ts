import { NextRequest, NextResponse } from "next/server";
import { getResolvedEntityBranding } from "@/app/data/entity-branding";

// GET /api/entities/[id]/branding
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const resolved = await getResolvedEntityBranding(id);

    return NextResponse.json(
      {
        entityId: resolved.entityId,
        tokens: {
          colors: resolved.colors,
          typography: resolved.typography,
        },
        palettes: resolved.palettes,
        typography: resolved.typographyRows,
        assets: resolved.assets,
        primaryLogoAsset: resolved.primaryLogoAsset,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Entity not found";
    const status = message.toLowerCase().includes("entity not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
