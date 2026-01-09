// CANONICAL (entity UI)
import { GET as getQuorum } from "@/app/api/governance/meetings/[meetingId]/quorum/route";

interface RouteParams {
    params: Promise<{ id: string; meetingId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    const { id, meetingId } = await context.params;
    void id;
    return getQuorum(req, { params: Promise.resolve({ meetingId }) });
}
