import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import type { Database } from "@/database.types";

type EntityUserRole = Database["public"]["Enums"]["entity_user_role"];
type EntityUserInsert = Database["public"]["Tables"]["entity_users"]["Insert"];

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

        const { data: existingRows, error: existingError } = await supabase
            .from("entity_users")
            .select("entity_id, entities:entities ( entity_type )")
            .eq("user_id", userId)
            .eq("entities.entity_type", "district");

        if (existingError) throw existingError;

        const existingIds = (existingRows ?? []).map((row) => row.entity_id);

        if (existingIds.length > 0) {
            const { error: delError } = await supabase
                .from("entity_users")
                .delete()
                .eq("user_id", userId)
                .in("entity_id", existingIds);

            if (delError) throw delError;
        }

        if (districtIds.length > 0) {
            const role: EntityUserRole = "admin";
            const rows: EntityUserInsert[] = districtIds.map((districtId) => ({
                user_id: userId,
                entity_id: districtId,
                role,
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
