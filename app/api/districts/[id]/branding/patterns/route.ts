import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

// GET /api/districts/[id]/branding/patterns?patternType=small|large
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    const supabase = await createApiClient();
    const districtId = params.id;
    const entityType = "district";

    const { searchParams } = new URL(req.url);
    const patternType = searchParams.get("patternType"); // optional

    let query = supabase
        .schema("branding")
        .from("patterns")
        .select("*")
        .eq("entity_id", districtId)
        .eq("entity_type", entityType)
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
