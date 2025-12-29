import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

// GET /api/districts/[id]/branding/fonts
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: districtId } = await params;
    const entityType = "district";
    const supabase = await createApiClient();

    const { data, error } = await supabase
        .schema("branding")
        .from("typography")
        .select("*")
        .eq("entity_id", districtId)
        .eq("entity_type", entityType)
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
    const entityType = "district";
    // auth: must be admin on district
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData.user.id;
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
        .eq("entity_id", districtId)
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

    const { data, error } = await supabase
        .schema("branding")
        .from("typography")
        .upsert(
            [
                {
                    entity_id: districtId,
                    entity_type: entityType,
                    role,
                    font_name: trimmedName,
                    availability,
                    weights,
                    usage_rules,
                },
            ],
            { onConflict: "entity_id,role,entity_type" },
        )
        .select("*");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ typography: data });
}
