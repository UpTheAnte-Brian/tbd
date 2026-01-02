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
      { status: 400 },
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
    slotId?: string | null;
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
      { status: 400 },
    );
  }

  const { data: entityRow, error: entityError } = await supabase
    .from("entities")
    .select("entity_type")
    .eq("id", entityId)
    .maybeSingle();

  if (entityError) {
    return NextResponse.json({ error: entityError.message }, { status: 500 });
  }

  const entityType = entityRow?.entity_type ?? null;
  if (!entityType) {
    return NextResponse.json(
      { error: "Entity type not found" },
      { status: 404 },
    );
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: canManage, error: permError } = await supabase.rpc(
    "can_manage_entity_assets",
    {
      p_uid: userData.user.id,
      p_entity_id: entityId,
    }
  );

  if (permError) {
    return NextResponse.json({ error: permError.message }, { status: 500 });
  }

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let slotQuery = supabase
    .schema("branding")
    .from("asset_slots")
    .select("id, category_id, subcategory_id")
    .eq("entity_type", entityType)
    .eq("category_id", body.categoryId);

  if (body.subcategoryId) {
    slotQuery = slotQuery.eq("subcategory_id", body.subcategoryId);
  } else {
    slotQuery = slotQuery.is("subcategory_id", null);
  }

  if (body.slotId) {
    slotQuery = slotQuery.eq("id", body.slotId);
  }

  const { data: slotRow, error: slotError } = await slotQuery.maybeSingle();

  if (slotError) {
    return NextResponse.json({ error: slotError.message }, { status: 500 });
  }

  if (!slotRow) {
    return NextResponse.json(
      { error: "No asset slot configured for this entity" },
      { status: 400 },
    );
  }

  const assetId = randomUUID();

  // Keep the original name for display/audit, but do not use it in the storage key.
  // User-provided filenames can contain spaces/symbols that lead to 400s at the Storage layer.
  const rawName = (body.name ?? "").trim();

  // Extract a conservative file extension (letters/numbers only). If none, store without an extension.
  const extMatch = rawName.match(/\.([A-Za-z0-9]{1,10})$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";
  const extSuffix = ext ? `.${ext}` : "";

  // Deterministic, URL-safe object key.
  const path = `branding/${entityType}/${entityId}/${slotRow.id}/${assetId}${extSuffix}`;

  const payload = {
    id: assetId,
    entity_id: entityId,
    category_id: body.categoryId,
    subcategory_id: body.subcategoryId ?? null,
    name: body.name ?? null,
    path,
    is_retired: false,
  };

  console.info("[branding-assets] create", {
    entityId,
    categoryId: body.categoryId,
    subcategoryId: body.subcategoryId ?? null,
    rawName: body.name ?? null,
    computedPath: path,
    assetId,
  });

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
