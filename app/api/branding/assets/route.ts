import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import { createApiClient } from "@/utils/supabase/route";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(
      value,
    );

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

export async function resolveDistrictEntityId(
  supabase: SupabaseClient<Database>,
  districtKey: string,
): Promise<string> {
  const { data: directEntity, error: directEntityError } = await supabase
    .from("entities")
    .select("id")
    .eq("id", districtKey)
    .eq("entity_type", "district")
    .maybeSingle();
  if (directEntityError) throw directEntityError;
  if (directEntity?.id) return directEntity.id;

  const { data: byDistrictId, error: byDistrictIdError } = await supabase
    .from("entities")
    .select("id")
    .eq("entity_type", "district")
    .eq("external_ids->>district_id", districtKey)
    .maybeSingle();
  if (byDistrictIdError) throw byDistrictIdError;
  if (byDistrictId?.id) return byDistrictId.id;

  const { data: bySdorgid, error: bySdorgidError } = await supabase
    .from("entities")
    .select("id")
    .eq("entity_type", "district")
    .eq("external_ids->>sdorgid", districtKey)
    .maybeSingle();
  if (bySdorgidError) throw bySdorgidError;
  if (bySdorgid?.id) return bySdorgid.id;

  if (isUuid(districtKey)) {
    const { data: districtRow, error: districtError } = await supabase
      .from("districts")
      .select("sdorgid, entity_id")
      .eq("id", districtKey)
      .maybeSingle();
    if (districtError) throw districtError;

    if (districtRow?.entity_id) {
      return districtRow.entity_id;
    }

    if (districtRow?.sdorgid) {
      const { data: bySdorgidFromDistrict, error } = await supabase
        .from("entities")
        .select("id")
        .eq("entity_type", "district")
        .eq("external_ids->>sdorgid", districtRow.sdorgid)
        .maybeSingle();
      if (error) throw error;
      if (bySdorgidFromDistrict?.id) return bySdorgidFromDistrict.id;
    }
  }

  throw new Error(`Entity not found for district ${districtKey}`);
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

  try {
    return await resolveDistrictEntityId(supabase, entityKey);
  } catch {
    throw new Error(`Entity not found for id ${entityKey}`);
  }
}
