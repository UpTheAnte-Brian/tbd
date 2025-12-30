import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createApiClient();
  const { id } = await context.params;
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

  const { data: existing, error: existingError } = await supabase
    .schema("branding")
    .from("assets")
    .select("path")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
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
