import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveDistrictEntityId } from "@/app/lib/entities";

type RoleRow = {
    role: string;
    entities?:
        | { entity_type?: string | null }[]
        | { entity_type?: string | null }
        | null;
};

const getEntityType = (row: RoleRow): string | null => {
    const entity = Array.isArray(row.entities) ? row.entities[0] : row.entities;
    return entity?.entity_type ?? null;
};

// PATCH /api/districts/[id]/branding/palettes/[paletteId]
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string; paletteId: string }> },
) {
    const supabase = await createApiClient();
    const { id: districtId, paletteId } = await context.params;
    const entityType = "district";

    // Authorization: user must be admin for this district
    const {
        data: userData,
        error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !userData?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    let entityId: string;
    try {
        entityId = await resolveDistrictEntityId(supabase, districtId);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Entity not found";
        return NextResponse.json({ error: message }, { status: 404 });
    }

    const { data: roleCheck } = await supabase
        .from("entity_users")
        .select("entity_id, role, user_id, entities:entities ( entity_type )")
        .eq("entity_id", entityId)
        .eq("user_id", userId);

    const rows = (roleCheck ?? []) as RoleRow[];
    const isAdmin = rows.some((row) =>
        row.role === "admin" && getEntityType(row) === "district"
    );

    if (!isAdmin) {
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

    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
        if (typeof body.name !== "string") {
            return NextResponse.json(
                { error: "name must be a string" },
                { status: 400 },
            );
        }
        update.name = body.name;
    }

    if (body.colors !== undefined) {
        if (!Array.isArray(body.colors)) {
            return NextResponse.json(
                { error: "colors must be an array" },
                { status: 400 },
            );
        }

        const colors: string[] = [];
        for (const c of body.colors) {
            if (typeof c !== "string" || !/^#([0-9A-Fa-f]{6})$/.test(c)) {
                return NextResponse.json(
                    { error: "Invalid color format. Must be hex #RRGGBB" },
                    { status: 400 },
                );
            }
            colors.push(c);
        }

        update.colors = colors;
    }

    if (body.role !== undefined) {
        if (typeof body.role !== "string") {
            return NextResponse.json(
                { error: "role must be a string" },
                { status: 400 },
            );
        }
        update.role = body.role;
    }

    if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, {
            status: 400,
        });
    }

    const { data, error } = await supabase
        .schema("branding")
        .from("palettes")
        .update(update)
        .eq("id", paletteId)
        .eq("entity_id", districtId)
        .eq("entity_type", entityType)
        .select("*")
        .single();

    if (error) {
        // Row not found
        if (error.code === "PGRST116") {
            return NextResponse.json({ error: "Palette not found" }, {
                status: 404,
            });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ palette: data });
}

// DELETE /api/districts/[id]/branding/palettes/[paletteId]
export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string; paletteId: string } },
) {
    const supabase = await createApiClient();
    const { id: districtId, paletteId } = params;

    // Authorization: user must be admin
    const {
        data: userData,
        error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !userData?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    let entityId: string;
    try {
        entityId = await resolveDistrictEntityId(supabase, districtId);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Entity not found";
        return NextResponse.json({ error: message }, { status: 404 });
    }

    const { data: roleCheck } = await supabase
        .from("entity_users")
        .select("entity_id, role, user_id, entities:entities ( entity_type )")
        .eq("entity_id", entityId)
        .eq("user_id", userId);

    const rows = (roleCheck ?? []) as RoleRow[];
    const isAdmin = rows.some((row) =>
        row.role === "admin" && getEntityType(row) === "district"
    );

    if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
        .schema("branding")
        .from("palettes")
        .delete()
        .eq("id", paletteId)
        .eq("district_id", districtId);

    if (error) {
        if (error.code === "PGRST116") {
            return NextResponse.json({ error: "Palette not found" }, {
                status: 404,
            });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
}
