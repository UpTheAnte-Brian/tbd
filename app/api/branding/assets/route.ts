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
    const status = message.toLowerCase().includes("entity not found")
      ? 404
      : 500;
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entityKey = body?.entityId as string | undefined;
    const categoryId = body?.categoryId as string | undefined;
    const subcategoryId = (body?.subcategoryId as string | undefined) ?? null;
    const slotId = body?.slotId as string | undefined;
    const rawName = body?.name as string | undefined;

    if (!entityKey || !categoryId || !slotId || !rawName) {
      return NextResponse.json(
        {
          error: "Missing required fields: entityId, categoryId, slotId, name",
        },
        { status: 400 },
      );
    }

    const supabase = await createApiClient();

    let entityId: string;
    try {
      entityId = await resolveEntityId(supabase, entityKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Entity not found";
      const status = message.toLowerCase().includes("entity not found")
        ? 404
        : 500;
      return NextResponse.json({ error: message }, { status });
    }

    // Canonical human name (do NOT store uploaded filename)
    // "WESTONKA_STACKED_PRIMARY.svg" -> "Stacked Primary"
    const canonicalName = (() => {
      const noExt = String(rawName).replace(/\.[^/.]+$/, "");
      const cleaned = noExt
        .replace(/^WESTONKA[_-]?/i, "")
        .replace(/^(DISTRICT|SCHOOL|ATHLETICS)[_-]?/i, "")
        .replace(/[_-]+/g, " ")
        .trim();
      if (!cleaned) return "Asset";
      return cleaned
        .toLowerCase()
        .split(/\s+/)
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");
    })();

    // Storage key should NOT depend on original filename (only keep extension)
    const extMatch = String(rawName).match(/\.[^/.]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : "";
    const objectKey = `${entityId}/${slotId}/${crypto.randomUUID()}${ext}`;

    const { data: asset, error } = await supabase
      .schema("branding")
      .from("assets")
      .insert({
        entity_id: entityId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        name: canonicalName,
        description: body?.description ?? null,
        bucket: "branding-assets",
        path: objectKey,
        mime_type: body?.mimeType ?? null,
        size_bytes: body?.sizeBytes ?? null,
        width_px: body?.widthPx ?? null,
        height_px: body?.heightPx ?? null,
        is_retired: false,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ asset }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
