import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/app/data/users";
import { createClient } from "@/utils/supabase/server";
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    const supabase = await createClient();
    // ✅ secure: validated against Supabase Auth server
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    const checkUser = user?.id === id;

    if (!checkUser) {
        return NextResponse.json({
            error: "Unauthorized",
            getUserError: userError,
        }, { status: 403 });
    }

    const users = await getUser(id);
    return NextResponse.json(users);
}
