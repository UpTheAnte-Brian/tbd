import { NextResponse } from "next/server";
import { supabaseServiceClient } from "../../../../utils/supabase/service-worker";

export async function POST(req: Request) {
    const { userId, role } = await req.json();

    if (!userId || !role) {
        return NextResponse.json({ error: "Missing userId or role" }, {
            status: 400,
        });
    }

    try {
        // 1. Update profiles table
        const { error: profileError } = await supabaseServiceClient
            .from("profiles")
            .update({ role })
            .eq("id", userId);

        if (profileError) throw profileError;

        // 2. Update auth.users.app_metadata
        const { error: authError } = await supabaseServiceClient.auth.admin
            .updateUserById(
                userId,
                { app_metadata: { role } },
            );

        if (authError) throw authError;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to set role:", err);
        return NextResponse.json({ error: "Failed to update role" }, {
            status: 500,
        });
    }
}
