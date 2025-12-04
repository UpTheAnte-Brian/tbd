import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

// GET /api/districts/[id]/branding/patterns?patternType=small|large
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    const supabase = await createApiClient();
    const districtId = params.id;

    const { searchParams } = new URL(req.url);
    const patternType = searchParams.get("patternType"); // optional

    let query = supabase
        .from("branding.patterns")
        .select("*")
        .eq("district_id", districtId)
        .order("created_at", { ascending: false });

    if (patternType) {
        query = query.eq("pattern_type", patternType);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ patterns: data });
}
