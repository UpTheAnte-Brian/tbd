import { NextResponse } from "next/server";
import { getEntityDTO } from "@/domain/entities/entity-dto";

// GET /api/entities/[id]/overview
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const dto = await getEntityDTO(id);
    return NextResponse.json(dto);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load entity overview";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
