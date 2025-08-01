import { createClient } from "../../../../utils/supabase/server"; // adjust if needed
import { NextResponse } from "next/server";
export async function POST(
    req: Request,
    { params }: { params: { id: string } },
) {
    const { id } = params;

    if (!id) {
        return NextResponse.json({ error: "Missing district ID" }, {
            status: 400,
        });
    }

    const body = await req.json();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("foundations")
        .upsert({ ...body, district_id: id }, { onConflict: "district_id" });

    if (error) {
        console.error("Error upserting foundation:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}
