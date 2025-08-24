import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;

    const supabase = await createClient();
    const userId = id;

    try {
        const { districtIds } = await request.json();

        if (!Array.isArray(districtIds)) {
            return NextResponse.json(
                { error: "districtIds must be an array" },
                { status: 400 },
            );
        }

        // 1️⃣ Clear out old assignments
        const { error: delError } = await supabase
            .from("district_users")
            .delete()
            .eq("user_id", userId);

        if (delError) throw delError;

        if (districtIds.length > 0) {
            // 2️⃣ Insert new assignments
            const rows = districtIds.map((districtId: string) => ({
                user_id: userId,
                district_id: districtId,
            }));

            const { error: insertError } = await supabase
                .from("district_users")
                .insert(rows);

            if (insertError) throw insertError;
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error assigning districts:", err);
        return NextResponse.json(
            { error: "Failed to assign districts" },
            { status: 500 },
        );
    }
}
