import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createApiClient();
  const { id } = await context.params;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: assetRow, error: assetError } = await supabase
    .schema("branding")
    .from("assets")
    .select("entity_id")
    .eq("id", id)
    .maybeSingle();

  if (assetError) {
    return NextResponse.json({ error: assetError.message }, { status: 500 });
  }

  const entityId = assetRow?.entity_id ?? null;
  if (!entityId) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
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
  const body = (await req.json().catch(() => ({}))) as {
    name?: string | null;
    path?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    isRetired?: boolean | null;
  };

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.path !== undefined) update.path = body.path;
  if (body.mimeType !== undefined) update.mime_type = body.mimeType;
  if (body.sizeBytes !== undefined) update.size_bytes = body.sizeBytes;
  if (body.isRetired !== undefined) update.is_retired = body.isRetired;

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .schema("branding")
    .from("assets")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ asset: data });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createApiClient();
  const { id } = await context.params;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing, error: existingError } = await supabase
    .schema("branding")
    .from("assets")
    .select("path, entity_id")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const entityId = (existing as { entity_id?: string | null } | null)
    ?.entity_id;
  if (!entityId) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
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

  const { error: deleteError } = await supabase
    .schema("branding")
    .from("assets")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const path = (existing as { path?: string | null } | null)?.path;
  if (path) {
    const { error: storageError } = await supabase.storage
      .from("branding-assets")
      .remove([path]);
    if (storageError) {
      return NextResponse.json(
        { error: storageError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ deleted: true });
}
