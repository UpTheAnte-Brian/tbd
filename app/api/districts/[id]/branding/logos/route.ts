import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { resolveDistrictEntityId } from "@/app/lib/entities";

type CategoryRow = {
    id: string;
    key?: string | null;
    label?: string | null;
};

const normalizeValue = (value: string) =>
    value.trim().toLowerCase().replace(/[\s-]+/g, "_");

const matchesValue = (value: string, rowValue?: string | null) =>
    rowValue ? normalizeValue(rowValue) === normalizeValue(value) : false;

const findCategory = (rows: CategoryRow[], value: string) =>
    rows.find((row) =>
        matchesValue(value, row.id) ||
        matchesValue(value, row.key) ||
        matchesValue(value, row.label)
    );

// GET /api/districts/[id]/branding/logos?category=&teamId=
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
    const category = searchParams.get("category");

    let categoryId: string | null = null;
    if (category) {
        const { data: categories, error: categoriesErr } = await supabase
            .schema("branding")
            .from("asset_categories")
            .select("id, key, label");

        if (categoriesErr) {
            return NextResponse.json({ error: categoriesErr.message }, {
                status: 500,
            });
        }

        const match = findCategory((categories ?? []) as CategoryRow[], category);
        if (!match) {
            return NextResponse.json({ error: "Unknown category" }, {
                status: 400,
            });
        }
        categoryId = match.id;
    }

    let query = supabase
        .schema("branding")
        .from("assets")
        .select("*")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

    if (categoryId) {
        query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logos: data ?? [] });
}
