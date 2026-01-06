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
        return NextResponse.json({ user: null }, { status: 401 });
    }

    try {
        const profile = await getUser(user.id);
        return NextResponse.json(profile);
    } catch (err) {
        // If the profile row doesn't exist yet, treat as unauthenticated for now.
        if (err instanceof Error && err.message === "Profile not found") {
            return NextResponse.json({ user: null }, { status: 401 });
        }
        console.error(err);
        return NextResponse.json({ error: "Failed to load profile" }, {
            status: 500,
        });
    }
}
