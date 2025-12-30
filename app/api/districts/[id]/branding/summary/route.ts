import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveDistrictEntityId } from "@/app/lib/entities";

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

    const logos: unknown[] = [];

    // Fetch all patterns
    const { data: patterns, error: patternsErr } = await supabase
        .schema("branding")
        .from("patterns")
        .select("*")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

    if (patternsErr) {
        return NextResponse.json({ error: patternsErr.message }, {
            status: 500,
        });
    }

    // Fetch color palettes
    const { data: palettes, error: palettesErr } = await supabase
        .schema("branding")
        .from("palettes")
        .select("*")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });

    if (palettesErr) {
        return NextResponse.json({ error: palettesErr.message }, {
            status: 500,
        });
    }

    // Fetch typography (top-level font family rules, not individual font files)
    const { data: typography, error: typographyErr } = await supabase
        .schema("branding")
        .from("typography")
        .select("*")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });

    if (typographyErr) {
        return NextResponse.json({ error: typographyErr.message }, {
            status: 500,
        });
    }

    // `fonts` is kept for compatibility; we only need one typography query.
    const fonts = typography;

    // Fetch schools for this district (used for school-logo uploads).
    // Some environments may not have branding.schools yet; treat as optional.
    let schools = [] as unknown[];
    const { data: schoolsData, error: schoolsErr } = await supabase
        .schema("branding")
        .from("schools")
        .select("*")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });

    if (schoolsErr) {
        const message = schoolsErr.message ?? "";
        if (!message.includes("branding.schools")) {
            return NextResponse.json({ error: schoolsErr.message }, {
                status: 500,
            });
        }
    } else {
        schools = schoolsData ?? [];
    }

    return new NextResponse(
        JSON.stringify({
            logos,
            patterns,
            fonts,
            palettes,
            typography,
            schools,
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                // Cache for 5 minutes, allow stale while revalidate for 1 hour
                "Cache-Control":
                    "public, s-maxage=300, stale-while-revalidate=3600",
            },
        },
    );
}
