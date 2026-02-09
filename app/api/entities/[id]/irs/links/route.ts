import { NextResponse } from "next/server";
import { resolveEntityId } from "@/app/lib/entities";
import { supabaseAdmin } from "@/utils/supabase/service-worker";

// GET /api/entities/[id]/irs/links
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Entity id is required" }, { status: 400 });
  }

  const entityId = await resolveEntityId(supabaseAdmin, id);
  const { data, error } = await supabaseAdmin
    .schema("irs")
    .from("entity_links")
    .select("ein")
    .eq("entity_id", entityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const eins = (data ?? [])
    .map((row) => row?.ein)
    .filter((value): value is string => typeof value === "string")
    .filter((value) => value.trim().length > 0);

  const uniqueEins = Array.from(new Set(eins));
  return NextResponse.json({ eins: uniqueEins });
}
