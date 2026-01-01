import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

// GET /api/entities?type=...&slug=...&active=true|false
export async function GET(req: NextRequest) {
  const supabase = await createApiClient();
  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get("type");
  const slugParam = searchParams.get("slug");
  const activeParam = searchParams.get("active");

  let query = supabase
    .from("entities")
    .select("id, entity_type, slug, name, active");

  if (typeParam) {
    const types = typeParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (types.length === 1) {
      query = query.eq("entity_type", types[0]);
    } else if (types.length > 1) {
      query = query.in("entity_type", types);
    }
  }

  if (slugParam) {
    query = query.eq("slug", slugParam);
  }

  if (activeParam === "true" || activeParam === "false") {
    query = query.eq("active", activeParam === "true");
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entities: data ?? [] });
}
