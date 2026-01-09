// CANONICAL (entity UI)
import {
    GET as getMeetingMinutes,
    POST as postMeetingMinutes,
} from "@/app/api/governance/meetings/[meetingId]/minutes/route";

interface RouteParams {
    params: Promise<{ id: string; meetingId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    const { id, meetingId } = await context.params;
    void id;
    return getMeetingMinutes(req, { params: Promise.resolve({ meetingId }) });
}

export async function POST(req: Request, context: RouteParams) {
    const { id, meetingId } = await context.params;
    void id;
    return postMeetingMinutes(req, { params: Promise.resolve({ meetingId }) });
}
