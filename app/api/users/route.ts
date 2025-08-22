import { NextResponse } from "next/server";
import { getAllUsers } from "@/app/data/users";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const role = session?.user?.user_metadata?.role;

    if (role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await getAllUsers();
    return NextResponse.json(users);
}
