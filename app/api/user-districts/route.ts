// app/api/user-districts/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server"; // adjust import if needed

export async function POST(req: Request) {
    try {
        const { userId, districtIds } = await req.json();

        if (!userId || !Array.isArray(districtIds)) {
            return NextResponse.json(
                { error: "Missing userId or districtIds" },
                { status: 400 },
            );
        }

        const supabase = await createClient();

        // First clear existing assignments for that user
        const { error: deleteError } = await supabase
            .from("district_users")
            .delete()
            .eq("user_id", userId);

        if (deleteError) throw deleteError;

        // Insert new assignments
        const { data, error: insertError } = await supabase
            .from("district_users")
            .insert(
                districtIds.map((districtId: string) => ({
                    user_id: userId,
                    district_id: districtId,
                    role: "viewer",
                })),
            );

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, data });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        console.error("Error in POST /api/user-districts:", err);
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: 500 },
        );
    }
}
