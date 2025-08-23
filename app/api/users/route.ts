import { NextResponse } from "next/server";
import { getAllUsers } from "@/app/data/users";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    const supabase = await createClient();
    // ✅ secure: validated against Supabase Auth server
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    const role = user?.user_metadata?.role;

    if (role !== "admin") {
        return NextResponse.json({
            error: "Unauthorized",
            getUserError: userError,
        }, { status: 403 });
    }

    const users = await getAllUsers();
    return NextResponse.json(users);
}
