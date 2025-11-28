import { NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

export async function GET() {
    const supabase = await createApiClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json([], { status: 200 });

    const { data, error } = await supabase
        .from("business_users")
        .select("businesses(*)")
        .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json(data.map((r) => r.businesses));
}
