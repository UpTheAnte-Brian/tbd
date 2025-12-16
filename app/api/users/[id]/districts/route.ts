import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;

    const supabase = await createApiClient();
    const userId = id;

    try {
        const { districtIds } = (await request.json()) as {
            districtIds?: string[];
        };

        if (!Array.isArray(districtIds)) {
            return NextResponse.json(
                { error: "districtIds must be an array" },
                { status: 400 },
            );
        }

        const { error: delError } = await supabase
            .from("entity_users")
            .delete()
            .eq("user_id", userId)
            .eq("entity_type", "district");

        if (delError) throw delError;

        if (districtIds.length > 0) {
            const rows = districtIds.map((districtId: string) => ({
                user_id: userId,
                entity_id: districtId,
                entity_type: "district",
                role: "admin",
            }));

            const { error: insertError } = await supabase
                .from("entity_users")
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
