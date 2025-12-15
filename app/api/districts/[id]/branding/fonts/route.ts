import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

// GET /api/districts/[id]/branding/fonts
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: districtId } = await params;
    const supabase = await createApiClient();

    const { data, error } = await supabase
        .schema("branding")
        .from("typography")
        .select("*")
        .eq("district_id", districtId)
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
                    district_id: districtId,
                    role,
                    font_name: trimmedName,
                    availability,
                    weights,
                    usage_rules,
                    updated_at: new Date().toISOString(),
                },
            ],
            { onConflict: "district_id,role" },
        )
        .select("*");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ typography: data });
}
