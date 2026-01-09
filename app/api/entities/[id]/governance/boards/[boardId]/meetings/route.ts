// CANONICAL (entity UI)
import {
    GET as getBoardMeetings,
    POST as postBoardMeeting,
} from "@/app/api/governance/boards/[boardId]/meetings/route";

interface RouteParams {
    params: Promise<{ id: string; boardId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    const { id, boardId } = await context.params;
    void id;
    return getBoardMeetings(req, { params: Promise.resolve({ boardId }) });
}

export async function POST(req: Request, context: RouteParams) {
    const { id, boardId } = await context.params;
    void id;
    return postBoardMeeting(req, { params: Promise.resolve({ boardId }) });
}
