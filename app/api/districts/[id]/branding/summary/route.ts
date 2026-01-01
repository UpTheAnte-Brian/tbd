import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveDistrictEntityId } from "@/app/lib/entities";
import { getEntityBrandingSummary } from "@/app/lib/server/entities";

// GET /api/districts/[id]/branding/summary
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const supabase = await createApiClient();
    const { id: districtId } = await context.params;
    let entityId: string;
    try {
        entityId = await resolveDistrictEntityId(supabase, districtId);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Entity not found";
        return NextResponse.json({ error: message }, { status: 404 });
    }

    try {
        const summary = await getEntityBrandingSummary(supabase, entityId);
        return new NextResponse(JSON.stringify(summary), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                // Cache for 5 minutes, allow stale while revalidate for 1 hour
                "Cache-Control":
                    "public, s-maxage=300, stale-while-revalidate=3600",
            },
        });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to load branding";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
