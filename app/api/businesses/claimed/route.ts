// app/api/businesses/claimed/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    const supabase = await createClient();
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
