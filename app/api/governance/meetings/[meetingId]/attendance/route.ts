import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/utils/supabase/route";

interface RouteParams {
    params: Promise<{ meetingId: string }>;
}

// POST /api/governance/meetings/[meetingId]/attendance
export async function POST(req: NextRequest, context: RouteParams) {
    const supabase = await createApiClient();
    const { meetingId } = await context.params;

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { board_member_id?: string; status?: "present" | "absent" } = {};
    const rawBody = await req.text();
    if (rawBody) {
        try {
            body = JSON.parse(rawBody) as {
                board_member_id?: string;
                status?: "present" | "absent";
            };
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }
    }

    const boardMemberId = body.board_member_id;
    const status = body.status;
    if (!boardMemberId || (status !== "present" && status !== "absent")) {
        return NextResponse.json(
            { error: "board_member_id and status are required" },
            { status: 400 },
        );
    }

    const { error } = await supabase
        .schema("governance")
        .from("meeting_attendance")
        .upsert(
            {
                meeting_id: meetingId,
                board_member_id: boardMemberId,
                status,
            },
            { onConflict: "meeting_id,board_member_id" },
        );

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
}
