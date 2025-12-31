import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveDistrictEntityId } from "@/app/lib/entities";

// GET /api/districts/[id]/branding/patterns?patternType=small|large
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    const supabase = await createApiClient();
    const districtId = params.id;
    let entityId: string;
    try {
        entityId = await resolveDistrictEntityId(supabase, districtId);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Entity not found";
        return NextResponse.json({ error: message }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const patternType = searchParams.get("patternType"); // optional

    let query = supabase
        .schema("branding")
        .from("patterns")
        .select("*")
        .eq("entity_id", entityId)
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
