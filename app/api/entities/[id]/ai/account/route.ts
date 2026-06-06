import { NextResponse } from "next/server";
import { getEntityAiAccountDTO } from "@/domain/ai/entity-ai-dto";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const dto = await getEntityAiAccountDTO(id);
    return NextResponse.json(dto);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load AI account";
    const status = message === "Unauthorized"
      ? 401
      : message === "Forbidden"
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
