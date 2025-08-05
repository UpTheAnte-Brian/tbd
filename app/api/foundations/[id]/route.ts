import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server"; // Adjust if needed

export async function GET(
    _req: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("foundations")
        .select("*")
        .eq("district_id", id)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ data }, { status: 200 });
}

export async function POST(
    _req: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    const supabase = await createClient();
    const body = await _req.json();

    const { error: upsertError } = await supabase
        .from("foundations")
        .upsert({ ...body, district_id: id }, { onConflict: "district_id" });

    if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, {
            status: 500,
        });
    }

    return NextResponse.json({}, { status: 201 });
}
