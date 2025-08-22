import { NextRequest, NextResponse } from "next/server";
import { assignUserToDistrict } from "@/app/data/users";
import { createClient } from "@/utils/supabase/server";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const role = session?.user?.user_metadata?.role;

    if (role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // ✅ read districtId from request body
    const { districtId } = await request.json();

    await assignUserToDistrict(id, districtId);
    return NextResponse.json({ success: true });
}
