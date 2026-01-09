// CANONICAL (entity UI)
import { POST as postAttendance } from "@/app/api/governance/meetings/[meetingId]/attendance/route";
import { NextRequest } from "next/server";

interface RouteParams {
    params: Promise<{ id: string; meetingId: string }>;
}

export async function POST(req: NextRequest, context: RouteParams) {
    const { id, meetingId } = await context.params;
    void id;
    return postAttendance(req, { params: Promise.resolve({ meetingId }) });
}
