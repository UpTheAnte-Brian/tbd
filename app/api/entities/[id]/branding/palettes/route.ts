import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import type { Database } from "@/database.types";

type ColorRole = Database["branding"]["Enums"]["color_role"];

// POST /api/entities/[id]/branding/palettes
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
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
      p_user_id: userId,
      p_entity_id: entityId,
    },
  );

  if (permError) {
    return NextResponse.json({ error: permError.message }, { status: 500 });
  }

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  type PaletteColorInput = {
    hex?: unknown;
    label?: unknown;
    usage_notes?: unknown;
  };

  type PaletteInput = {
    name?: string;
    colors?: unknown;
    role?: unknown;
  };

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
    return NextResponse.json({ error: "colors must be an array" }, {
      status: 400,
    });
  }

  const roleOptions: ColorRole[] = ["primary", "secondary", "accent"];
  if (!roleOptions.includes(roleRaw as ColorRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const role = roleRaw as ColorRole;
  const colors = colorsRaw.map((color, index) => {
    if (typeof color === "string") {
      if (!/^#([0-9A-Fa-f]{6})$/.test(color)) {
        return null;
      }
      return {
        slot: index,
        hex: color.toUpperCase(),
        label: null,
        usage_notes: null,
      };
    }

    if (!color || typeof color !== "object") return null;
    const { hex, label, usage_notes } = color as PaletteColorInput;
    if (typeof hex !== "string" || !/^#([0-9A-Fa-f]{6})$/.test(hex)) {
      return null;
    }

    return {
      slot: index,
      hex: hex.toUpperCase(),
      label: typeof label === "string" ? label : null,
      usage_notes: typeof usage_notes === "string" ? usage_notes : null,
    };
  });

  if (colors.some((color) => !color)) {
    return NextResponse.json(
      { error: "Invalid color format. Must be hex #RRGGBB" },
      { status: 400 },
    );
  }

  const resolvedName = typeof name === "string" && name.trim().length > 0
    ? name.trim()
    : role;

  const { data: palette, error } = await supabase
    .schema("branding")
    .from("palettes")
    .upsert(
      {
        entity_id: entityId,
        name: resolvedName,
        role,
      },
      { onConflict: "entity_id,role" },
    )
    .select("id, entity_id, role, name, usage_notes, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: deleteErr } = await supabase
    .schema("branding")
    .from("palette_colors")
    .delete()
    .eq("palette_id", palette.id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  let insertedColors = colors as Exclude<(typeof colors)[number], null>[];
  if (insertedColors.length > 0) {
    const { data: paletteColors, error: colorsErr } = await supabase
      .schema("branding")
      .from("palette_colors")
      .insert(
        insertedColors.map((color) => ({
          palette_id: palette.id,
          slot: color.slot,
          hex: color.hex,
          label: color.label,
          usage_notes: color.usage_notes,
        })),
      )
      .select("id, slot, hex, label, usage_notes")
      .order("slot", { ascending: true });

    if (colorsErr) {
      return NextResponse.json({ error: colorsErr.message }, { status: 500 });
    }

    insertedColors = (paletteColors ?? []).map((color) => ({
      id: color.id ?? undefined,
      slot: Number(color.slot ?? 0),
      hex: String(color.hex ?? ""),
      label: color.label ?? null,
      usage_notes: color.usage_notes ?? null,
    }));
  }

  return NextResponse.json(
    { palette: { ...palette, colors: insertedColors } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
