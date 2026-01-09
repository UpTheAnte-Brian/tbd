// CANONICAL (entity UI)
import {
    GET as getMotionVotes,
    POST as postMotionVote,
} from "@/app/api/governance/motions/[motionId]/votes/route";

interface RouteParams {
    params: Promise<{ id: string; motionId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    const { id, motionId } = await context.params;
    void id;
    return getMotionVotes(req, { params: Promise.resolve({ motionId }) });
}

export async function POST(req: Request, context: RouteParams) {
    const { id, motionId } = await context.params;
    void id;
    return postMotionVote(req, { params: Promise.resolve({ motionId }) });
}
