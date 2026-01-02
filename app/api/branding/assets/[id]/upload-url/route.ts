import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { supabaseServiceClient } from "@/utils/supabase/service-worker";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createApiClient();
  const { id: assetId } = await context.params;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: asset, error: assetError } = await supabaseServiceClient
    .schema("branding")
    .from("assets")
    .select("id, entity_id, path")
    .eq("id", assetId)
    .maybeSingle();

  if (assetError) {
    return NextResponse.json({ error: assetError.message }, { status: 500 });
  }

  if (!asset || !asset.entity_id) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (!asset.path) {
    return NextResponse.json(
      { error: "Asset path is missing" },
      { status: 400 }
    );
  }

  const { data: canManage, error: permError } = await supabase.rpc(
    "can_manage_entity_assets",
    {
      p_uid: userData.user.id,
      p_entity_id: asset.entity_id,
    }
  );

  if (permError) {
    return NextResponse.json({ error: permError.message }, { status: 500 });
  }

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: signed, error: signedError } =
    await supabaseServiceClient.storage
      .from("branding-assets")
      .createSignedUploadUrl(asset.path, { upsert: true });

  if (signedError || !signed) {
    return NextResponse.json(
      { error: signedError?.message ?? "Failed to sign upload" },
      { status: 500 }
    );
  }

  console.info("[branding-assets] signed_upload", {
    assetId: asset.id,
    entityId: asset.entity_id,
    path: asset.path,
    bucket: "branding-assets",
    userId: userData.user.id,
  });

  return NextResponse.json({
    assetId: asset.id,
    entityId: asset.entity_id,
    path: signed.path,
    token: signed.token,
    signedUrl: signed.signedUrl,
  });
}
