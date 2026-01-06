import { NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

interface RouteParams {
    params: Promise<{ meetingId: string }>;
}

// GET /api/governance/meetings/[meetingId]/quorum
export async function GET(req: Request, context: RouteParams) {
    const supabase = await createApiClient();
    const { meetingId } = await context.params;

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
        .schema("governance")
        .rpc("is_quorum_met", { p_meeting_id: meetingId });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
        { quorumMet: Boolean(data) },
        { status: 200 },
    );
}
