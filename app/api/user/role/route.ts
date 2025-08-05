// app/api/user/role/route.ts
import { cookies } from "next/headers";
// The client you created from the Server-Side Auth instructions
import { createClient } from "../../../../utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const access_token = cookieStore.get("sb-access-token")?.value;

    if (!access_token) {
        return NextResponse.json({ role: null, error: "Unauthorized" }, {
            status: 401,
        });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
        access_token,
    );

    if (userError || !user) {
        return NextResponse.json({ role: null, error: "Unauthorized" }, {
            status: 401,
        });
    }

    const { data: roleRow, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

    if (roleError || !roleRow) {
        return NextResponse.json({ role: null, error: "Role not found" }, {
            status: 404,
        });
    }

    return NextResponse.json({ role: roleRow.role });
}
