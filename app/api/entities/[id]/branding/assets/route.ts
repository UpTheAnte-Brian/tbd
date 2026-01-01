import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";

// POST /api/entities/[id]/branding/assets
// Body: { categoryId, subcategoryId?, name? }
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createApiClient();
  const { id: entityKey } = await context.params;

  let body: { categoryId?: string | null; subcategoryId?: string | null; name?: string | null };
  try {
    body = (await req.json()) as {
      categoryId?: string | null;
      subcategoryId?: string | null;
      name?: string | null;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.categoryId) {
    return NextResponse.json(
      { error: "categoryId is required" },
      { status: 400 }
    );
  }

  let entityId = entityKey;
  try {
    entityId = await resolveEntityId(supabase, entityKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Entity not found";
    return NextResponse.json({ error: message }, { status: 404 });
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

  return NextResponse.json({ asset: data }, { status: 201 });
}
