import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveDistrictEntityId } from "@/app/lib/entities";

export async function GET(req: NextRequest) {
  const supabase = await createApiClient();
  const { searchParams } = new URL(req.url);
  const entityIdParam = searchParams.get("entityId");
  const districtIdParam = searchParams.get("districtId");
  const includeRetired = searchParams.get("includeRetired") === "true";

  if (!entityIdParam && !districtIdParam) {
    return NextResponse.json(
      { error: "entityId or districtId is required" },
      { status: 400 }
    );
  }

  let entityId = entityIdParam ?? "";
  if (!entityId && districtIdParam) {
    try {
      entityId = await resolveDistrictEntityId(supabase, districtIdParam);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Entity not found";
      return NextResponse.json({ error: message }, { status: 404 });
    }
  }

  let query = supabase
    .schema("branding")
    .from("assets")
    .select("*")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (!includeRetired) {
    query = query.eq("is_retired", false);
  }

  const { data: assets, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: assets ?? [], entityId });
}

export async function POST(req: NextRequest) {
  const supabase = await createApiClient();
  const body = (await req.json()) as {
    entityId?: string;
    districtId?: string;
    categoryId?: string | null;
    subcategoryId?: string | null;
    name?: string | null;
  };

  let entityId = body.entityId ?? "";
  if (!entityId && body.districtId) {
    try {
      entityId = await resolveDistrictEntityId(supabase, body.districtId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Entity not found";
      return NextResponse.json({ error: message }, { status: 404 });
    }
  }

  if (!entityId || !body.categoryId) {
    return NextResponse.json(
      { error: "entityId and categoryId are required" },
      { status: 400 }
    );
  }

  const assetId = randomUUID();
  const rawName = (body.name ?? "").trim();
  const safeName = rawName ? rawName.replace(/[\\/]/g, "-") : "asset";
  const path = `${entityId}/${assetId}/${safeName}`;
  const payload = {
    id: assetId,
    entity_id: entityId,
    category_id: body.categoryId,
    subcategory_id: body.subcategoryId ?? null,
    name: body.name ?? null,
    path,
    is_retired: false,
  };

  const { data, error } = await supabase
    .schema("branding")
    .from("assets")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ asset: data });
}
