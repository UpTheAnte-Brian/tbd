import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";
import type { Database } from "@/database.types";

type ColorRole = Database["branding"]["Enums"]["color_role"];

const ROLE_OPTIONS: ColorRole[] = ["primary", "secondary", "accent"];
const HEX_PATTERN = /^#([0-9A-Fa-f]{6})$/;

type RouteParams = {
  id: string;
  paletteId: string;
  slot: string;
};

// PATCH /api/entities/[id]/branding/palettes/[paletteId]/colors/[slot]
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<RouteParams> },
) {
  const supabase = await createApiClient();
  const { id: entityKey, paletteId: roleParam, slot: slotParam } = await context
    .params;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      p_user_id: userData.user.id,
      p_entity_id: entityId,
    },
  );

  if (permError) {
    return NextResponse.json({ error: permError.message }, { status: 500 });
  }

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!ROLE_OPTIONS.includes(roleParam as ColorRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  const role = roleParam as ColorRole;

  const slot = Number.parseInt(slotParam, 10);
  if (!Number.isInteger(slot) || slot < 0) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  type BodyInput = { hex?: unknown };
  let body: BodyInput;
  try {
    body = (await req.json()) as BodyInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hexValue = body.hex;
  if (hexValue !== null && typeof hexValue !== "string") {
    return NextResponse.json({ error: "hex must be a string or null" }, {
      status: 400,
    });
  }

  if (typeof hexValue === "string" && !HEX_PATTERN.test(hexValue)) {
    return NextResponse.json(
      { error: "Invalid hex format. Must be #RRGGBB" },
      { status: 400 },
    );
  }

  const { data: existingPalette, error: paletteError } = await supabase
    .schema("branding")
    .from("palettes")
    .select("id")
    .eq("entity_id", entityId)
    .eq("role", role)
    .maybeSingle();

  if (paletteError) {
    return NextResponse.json({ error: paletteError.message }, { status: 500 });
  }

  let paletteId = existingPalette?.id ?? null;
  if (!paletteId) {
    const { data: createdPalette, error: createErr } = await supabase
      .schema("branding")
      .from("palettes")
      .insert({
        entity_id: entityId,
        name: `${roleParam} palette`,
        role,
      })
      .select("id")
      .single();

    if (createErr) {
      if (
        createErr.code === "23505" ||
        createErr.message.includes("branding_palettes_entity_role_unique")
      ) {
        const { data: existing, error: reloadErr } = await supabase
          .schema("branding")
          .from("palettes")
          .select("id")
          .eq("entity_id", entityId)
          .eq("role", role)
          .single();

        if (reloadErr) {
          return NextResponse.json({ error: reloadErr.message }, {
            status: 500,
          });
        }

        paletteId = existing.id;
      } else {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
    } else {
      paletteId = createdPalette.id;
    }
  }

  if (hexValue === null) {
    const { error: deleteErr } = await supabase
      .schema("branding")
      .from("palette_colors")
      .delete()
      .eq("palette_id", paletteId)
      .eq("slot", slot);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, paletteId, slot, action: "deleted" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const normalizedHex = hexValue.toUpperCase();
  const { error: upsertErr } = await supabase
    .schema("branding")
    .from("palette_colors")
    .upsert(
      {
        palette_id: paletteId,
        slot,
        hex: normalizedHex,
      },
      { onConflict: "palette_id,slot" },
    );

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, paletteId, slot, hex: normalizedHex, action: "upserted" },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
