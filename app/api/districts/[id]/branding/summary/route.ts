import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

// GET /api/districts/[id]/branding/summary
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    const supabase = await createApiClient();
    const districtId = params.id;

    // Fetch all logos
    const { data: logos, error: logosErr } = await supabase
        .from("branding.logos")
        .select("*")
        .eq("district_id", districtId)
        .order("created_at", { ascending: false });

    if (logosErr) {
        return NextResponse.json({ error: logosErr.message }, { status: 500 });
    }

    // Fetch all patterns
    const { data: patterns, error: patternsErr } = await supabase
        .from("branding.patterns")
        .select("*")
        .eq("district_id", districtId)
        .order("created_at", { ascending: false });

    if (patternsErr) {
        return NextResponse.json({ error: patternsErr.message }, {
            status: 500,
        });
    }

    // Fetch all font definitions
    const { data: fonts, error: fontsErr } = await supabase
        .from("branding.typography")
        .select("*")
        .eq("district_id", districtId)
        .order("created_at", { ascending: false });

    if (fontsErr) {
        return NextResponse.json({ error: fontsErr.message }, { status: 500 });
    }

    // Fetch color palettes
    const { data: palettes, error: palettesErr } = await supabase
        .from("branding.palettes")
        .select("*")
        .eq("district_id", districtId)
        .order("created_at", { ascending: true });

    if (palettesErr) {
        return NextResponse.json({ error: palettesErr.message }, {
            status: 500,
        });
    }

    // Fetch typography (top-level font family rules, not individual font files)
    const { data: typography, error: typographyErr } = await supabase
        .from("branding.typography")
        .select("*")
        .eq("district_id", districtId)
        .order("created_at", { ascending: true });

    if (typographyErr) {
        return NextResponse.json({ error: typographyErr.message }, {
            status: 500,
        });
    }

    return new NextResponse(
        JSON.stringify({
            logos,
            patterns,
            fonts,
            palettes,
            typography,
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
