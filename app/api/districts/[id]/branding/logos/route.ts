import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

// GET /api/districts/[id]/branding/logos?category=&schoolId=&teamId=
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    const supabase = await createApiClient();
    const districtId = params.id;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const schoolId = searchParams.get("schoolId");
    const teamId = searchParams.get("teamId");

    // Build the query
    let query = supabase
        .schema("branding")
        .from("logos")
        .select("*")
        .eq("district_id", districtId)
        .order("created_at", { ascending: false });

    if (category) {
        query = query.eq("category", category);
    }

    if (schoolId) {
        query = query.eq("school_id", schoolId);
    }

    if (teamId) {
        query = query.eq("team_id", teamId); // Optional future support
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logos: data });
}
