import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";

// PATCH /api/entities/[id]/branding/palettes/[paletteId]
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; paletteId: string }> }
) {
  const supabase = await createApiClient();
  const { id: entityKey, paletteId } = await context.params;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = userData.user.id;
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

  type PaletteUpdate = {
    name?: unknown;
    colors?: unknown;
    role?: unknown;
  };

  let body: PaletteUpdate;
  try {
    body = (await req.json()) as PaletteUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const paletteUpdate: Record<string, unknown> = {};
  let colorsUpdate: Array<{
    slot: number;
    hex: string;
    label: string | null;
    usage_notes: string | null;
  }> | null = null;

  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "name must be a string" }, { status: 400 });
    }
    paletteUpdate.name = body.name;
  }

  if (body.colors !== undefined) {
    if (!Array.isArray(body.colors)) {
      return NextResponse.json({ error: "colors must be an array" }, { status: 400 });
    }

    const colors = body.colors.map((color, index) => {
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
      const { hex, label, usage_notes } = color as {
        hex?: unknown;
        label?: unknown;
        usage_notes?: unknown;
      };
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
        { status: 400 }
      );
    }

    colorsUpdate = colors as Array<{
      slot: number;
      hex: string;
      label: string | null;
      usage_notes: string | null;
    }>;
  }

  if (body.role !== undefined) {
    if (typeof body.role !== "string") {
      return NextResponse.json({ error: "role must be a string" }, { status: 400 });
    }
    const roleOptions = ["primary", "secondary", "accent"];
    if (!roleOptions.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    paletteUpdate.role = body.role;
  }

  const hasPaletteUpdates = Object.keys(paletteUpdate).length > 0;
  const hasColorsUpdate = colorsUpdate !== null;

  if (!hasPaletteUpdates && !hasColorsUpdate) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const paletteQuery = supabase
    .schema("branding")
    .from("palettes");

  const { data, error } = hasPaletteUpdates
    ? await paletteQuery
        .update(paletteUpdate)
        .eq("id", paletteId)
        .eq("entity_id", entityId)
        .select("id, entity_id, role, name, usage_notes, created_at, updated_at")
        .single()
    : await paletteQuery
        .select("id, entity_id, role, name, usage_notes, created_at, updated_at")
        .eq("id", paletteId)
        .eq("entity_id", entityId)
        .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Palette not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let colors = [] as Array<{
    id?: string;
    slot: number;
    hex: string;
    label?: string | null;
    usage_notes?: string | null;
  }>;

  if (hasColorsUpdate && colorsUpdate) {
    const { error: deleteErr } = await supabase
      .schema("branding")
      .from("palette_colors")
      .delete()
      .eq("palette_id", data.id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    if (colorsUpdate.length > 0) {
      const { data: paletteColors, error: colorsErr } = await supabase
        .schema("branding")
        .from("palette_colors")
        .insert(
          colorsUpdate.map((color) => ({
            palette_id: data.id,
            slot: color.slot,
            hex: color.hex,
            label: color.label,
            usage_notes: color.usage_notes,
          }))
        )
        .select("id, slot, hex, label, usage_notes")
        .order("slot", { ascending: true });

      if (colorsErr) {
        return NextResponse.json({ error: colorsErr.message }, { status: 500 });
      }

      colors = (paletteColors ?? []).map((color) => ({
        id: color.id ?? undefined,
        slot: Number(color.slot ?? 0),
        hex: String(color.hex ?? ""),
        label: color.label ?? null,
        usage_notes: color.usage_notes ?? null,
      }));
    }
  } else {
    const { data: paletteColors, error: colorsErr } = await supabase
      .schema("branding")
      .from("palette_colors")
      .select("id, slot, hex, label, usage_notes")
      .eq("palette_id", data.id)
      .order("slot", { ascending: true });

    if (colorsErr) {
      return NextResponse.json({ error: colorsErr.message }, { status: 500 });
    }

    colors = (paletteColors ?? []).map((color) => ({
      id: color.id ?? undefined,
      slot: Number(color.slot ?? 0),
      hex: String(color.hex ?? ""),
      label: color.label ?? null,
      usage_notes: color.usage_notes ?? null,
    }));
  }

  return NextResponse.json({ palette: { ...data, colors } });
}

// DELETE /api/entities/[id]/branding/palettes/[paletteId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; paletteId: string } }
) {
  const supabase = await createApiClient();
  const { id: entityKey, paletteId } = params;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = userData.user.id;
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

  const { error } = await supabase
    .schema("branding")
    .from("palettes")
    .delete()
    .eq("id", paletteId)
    .eq("entity_id", entityId);

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Palette not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
