import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import { createApiClient } from "@/utils/supabase/route";

export async function GET(req: NextRequest) {
  const supabase = await createApiClient();
  const { searchParams } = new URL(req.url);
  const entityKey = searchParams.get("entityId");

  if (!entityKey) {
    return NextResponse.json(
      { error: "entityId is required" },
      { status: 400 },
    );
  }

  let entityId: string;
  try {
    entityId = await resolveEntityId(supabase, entityKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Entity not found";
    const status = message.toLowerCase().includes("entity not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const { data, error } = await supabase
    .schema("branding")
    .from("assets")
    .select("*")
    .eq("entity_id", entityId)
    .or("is_retired.is.null,is_retired.eq.false")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: data ?? [] });
}

export async function resolveEntityId(
  supabase: SupabaseClient<Database>,
  entityKey: string,
): Promise<string> {
  const { data: directEntity, error: directEntityError } = await supabase
    .from("entities")
    .select("id")
    .eq("id", entityKey)
    .maybeSingle();
  if (directEntityError) throw directEntityError;
  if (directEntity?.id) return directEntity.id;

  const { data: byDistrictId, error: byDistrictIdError } = await supabase
    .from("entities")
    .select("id")
    .eq("entity_type", "district")
    .eq("external_ids->>district_id", entityKey)
    .maybeSingle();
  if (byDistrictIdError) throw byDistrictIdError;
  if (byDistrictId?.id) return byDistrictId.id;

  const { data: bySdorgid, error: bySdorgidError } = await supabase
    .from("entities")
    .select("id")
    .eq("entity_type", "district")
    .eq("external_ids->>sdorgid", entityKey)
    .maybeSingle();
  if (bySdorgidError) throw bySdorgidError;
  if (bySdorgid?.id) return bySdorgid.id;

  throw new Error(`Entity not found for id ${entityKey}`);
}
