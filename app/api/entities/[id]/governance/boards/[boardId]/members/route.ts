// CANONICAL (entity UI)
import {
    GET as getBoardMembers,
    POST as postBoardMember,
} from "@/app/api/governance/boards/[boardId]/members/route";

interface RouteParams {
    params: Promise<{ id: string; boardId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    const { id, boardId } = await context.params;
    void id;
    return getBoardMembers(req, { params: Promise.resolve({ boardId }) });
}

export async function POST(req: Request, context: RouteParams) {
    const { id, boardId } = await context.params;
    void id;
    return postBoardMember(req, { params: Promise.resolve({ boardId }) });
}
