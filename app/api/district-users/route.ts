import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
    try {
        const { districtId, userId, role } = await req.json();

        if (!districtId || !userId || !role) {
            return NextResponse.json(
                { error: "Missing districtId, userId, or role" },
                { status: 400 },
            );
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from("district_users")
            .insert([{ district_id: districtId, user_id: userId, role }])
            .select();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        console.error("Error in POST /api/district-users:", err);
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: 500 },
        );
    }
}
