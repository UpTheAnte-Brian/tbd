import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveDistrictEntityId } from "@/app/lib/entities";

// GET /api/districts/[id]/branding/fonts
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: districtId } = await params;
    const supabase = await createApiClient();
    let entityId: string;
    try {
        entityId = await resolveDistrictEntityId(supabase, districtId);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Entity not found";
        return NextResponse.json({ error: message }, { status: 404 });
    }

    const { data, error } = await supabase
        .schema("branding")
        .from("typography")
        .select("*")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ fonts: data });
}

// PUT /api/districts/[id]/branding/fonts
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: districtId } = await params;
    const supabase = await createApiClient();
    // auth: must be admin on district
    const { data: userData, error: userErr } = await supabase.auth.getUser();
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
    type RoleRow = {
        role: string;
        entities?:
            | { entity_type?: string | null }[]
            | { entity_type?: string | null }
            | null;
    };
    const { data: roleRows } = await supabase
        .from("entity_users")
        .select("entity_id, role, user_id, entities:entities ( entity_type )")
        .eq("entity_id", entityId)
        .eq("user_id", userId);
    const getEntityType = (row: RoleRow): string | null => {
        const entity = Array.isArray(row.entities)
            ? row.entities[0]
            : row.entities;
        return entity?.entity_type ?? null;
    };
    const rows = (roleRows ?? []) as RoleRow[];
    const isAdmin = rows.some((row) =>
        row.role === "admin" && getEntityType(row) === "district"
    );
    if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const { role, font_name, availability, weights, usage_rules } = body;
    const validAvailability = ["system", "google", "licensed"];

    const trimmedName = typeof font_name === "string" ? font_name.trim() : "";
    const fontNameValid = trimmedName.length > 0 &&
        /^[A-Za-z0-9][A-Za-z0-9\s.'’_-]*$/.test(trimmedName) &&
        !trimmedName.includes("://") &&
        !trimmedName.includes("/");
    if (!role || !fontNameValid) {
        return NextResponse.json(
            { error: "role and valid font_name are required" },
            { status: 400 },
        );
    }

    if (
        availability &&
        !validAvailability.includes(String(availability))
    ) {
        return NextResponse.json(
            { error: "availability must be system, google, or licensed" },
            { status: 400 },
        );
    }

    const { data: existing, error: existingErr } = await supabase
        .schema("branding")
        .from("typography")
        .select("id")
        .eq("entity_id", entityId)
        .eq("role", role)
        .maybeSingle();

    if (existingErr) {
        return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    const payload = {
        entity_id: entityId,
        role,
        font_name: trimmedName,
        availability,
        weights,
        usage_rules,
    };

    const { data, error } = existing?.id
        ? await supabase
            .schema("branding")
            .from("typography")
            .update(payload)
            .eq("id", existing.id)
            .select("*")
            .single()
        : await supabase
            .schema("branding")
            .from("typography")
            .insert(payload)
            .select("*")
            .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ typography: data });
}
