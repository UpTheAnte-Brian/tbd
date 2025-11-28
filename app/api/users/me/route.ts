import { NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";
import { getUser } from "@/app/data/users";

export async function GET() {
    const supabase = await createApiClient();

    // Get currently signed-in user
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const profile = await getUser(user.id);
        return NextResponse.json(profile);
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to load profile" },
            { status: 500 },
        );
    }
}
