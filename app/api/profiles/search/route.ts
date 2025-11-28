import { type NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { createApiClient } from "@/utils/supabase/route";

export async function GET(req: NextRequest) {
    return safeRoute(async () => {
        const supabase = await createApiClient();
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q");

        if (!q || q.length < 2) {
            return NextResponse.json([]);
        }

        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name")
            .ilike("full_name", `%${q}%`)
            .not("full_name", "is", null)
            .limit(15);

        if (error) throw error;

        return NextResponse.json(data);
    });
}
