import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import type { Database } from "@/database.types";

type ColorRole = Database["branding"]["Enums"]["color_role"];

// POST /api/entities/[id]/branding/palettes
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createApiClient();
  const { id: entityKey } = await context.params;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId: string = userData.user.id;

  let entityId: string;
  try {
    entityId = await resolveEntityId(supabase, entityKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Entity not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  const { data: canManage, error: permError } = await supabase.rpc(
    "can_manage_entity_assets",
    {
      p_uid: userId,
      p_entity_id: entityId,
    }
  );

  if (permError) {
    return NextResponse.json({ error: permError.message }, { status: 500 });
  }

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  type PaletteInput = { name?: string; colors?: unknown; role?: unknown };

  let body: PaletteInput;
  try {
    body = (await req.json()) as PaletteInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name;
  const colorsRaw = body.colors;
  const roleRaw = body.role;

  if (typeof roleRaw !== "string") {
    return NextResponse.json({ error: "role is required" }, { status: 400 });
  }
  if (!Array.isArray(colorsRaw)) {
    return NextResponse.json({ error: "colors must be an array" }, { status: 400 });
  }

  const roleOptions: ColorRole[] = ["primary", "secondary", "accent"];
  if (!roleOptions.includes(roleRaw as ColorRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const role = roleRaw as ColorRole;
  const colors: string[] = [];
  for (const c of colorsRaw) {
    if (typeof c !== "string" || !/^#([0-9A-Fa-f]{6})$/.test(c)) {
      return NextResponse.json(
        { error: "Invalid color format. Must be hex #RRGGBB" },
        { status: 400 }
      );
    }
    colors.push(c);
  }

  const resolvedName =
    typeof name === "string" && name.trim().length > 0 ? name.trim() : role;

  const { data, error } = await supabase
    .schema("branding")
    .from("palettes")
    .upsert(
      {
        entity_id: entityId,
        name: resolvedName,
        colors,
        role,
      },
      { onConflict: "entity_id,role" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { palette: data },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
