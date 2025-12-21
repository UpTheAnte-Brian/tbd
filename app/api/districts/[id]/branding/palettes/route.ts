import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { isEntityAdmin } from "@/app/lib/auth/entityRoles";

// POST /api/districts/[id]/branding/palettes
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const supabase = await createApiClient();
    const { id: districtId } = await context.params;
    const entityType = "district";

    // Authorization: user must be admin for this district
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId: string = userData.user.id;

    const { data: entityRoles } = await supabase
        .from("entity_users")
        .select("entity_type, entity_id, role, user_id")
        .eq("entity_type", entityType)
        .eq("entity_id", districtId)
        .eq("user_id", userId);

    if (!isEntityAdmin(entityRoles ?? [], "district", districtId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    type PaletteInput = { name?: string; colors?: unknown; role?: string };

    let body: PaletteInput;
    try {
        body = await req.json() as PaletteInput;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const name: string | undefined = body.name;
    const colorsRaw = body.colors;
    const role = body.role;

    if (!name) {
        return NextResponse.json({ error: "name is required" }, {
            status: 400,
        });
    }
    if (!Array.isArray(colorsRaw)) {
        return NextResponse.json({ error: "colors must be an array" }, {
            status: 400,
        });
    }

    const colors: string[] = [];
    for (const c of colorsRaw) {
        if (typeof c !== "string" || !/^#([0-9A-Fa-f]{6})$/.test(c)) {
            return NextResponse.json(
                { error: "Invalid color format. Must be hex #RRGGBB" },
                { status: 400 },
            );
        }
        colors.push(c);
    }

    const { data, error } = await supabase
        .schema("branding")
        .from("palettes")
        .insert({
            entity_id: districtId,
            entity_type: entityType,
            name,
            colors,
            role,
        })
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
        { palette: data },
        {
            status: 201,
            headers: { "Cache-Control": "no-store" },
        },
    );
}
