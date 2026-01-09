// CANONICAL (entity UI)
import {
    GET as getMeetingMotions,
    POST as postMeetingMotion,
} from "@/app/api/governance/meetings/[meetingId]/motions/route";

interface RouteParams {
    params: Promise<{ id: string; meetingId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    const { id, meetingId } = await context.params;
    void id;
    return getMeetingMotions(req, { params: Promise.resolve({ meetingId }) });
}

export async function POST(req: Request, context: RouteParams) {
    const { id, meetingId } = await context.params;
    void id;
    return postMeetingMotion(req, { params: Promise.resolve({ meetingId }) });
}
