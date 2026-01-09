// CANONICAL (entity UI)
import {
    DELETE as deleteBoardMember,
    PATCH as patchBoardMember,
} from "@/app/api/governance/board-members/[id]/route";

interface RouteParams {
    params: Promise<{ id: string; memberId: string }>;
}

export async function PATCH(req: Request, context: RouteParams) {
    const { id, memberId } = await context.params;
    void id;
    return patchBoardMember(req, { params: Promise.resolve({ id: memberId }) });
}

export async function DELETE(req: Request, context: RouteParams) {
    const { id, memberId } = await context.params;
    void id;
    return deleteBoardMember(req, { params: Promise.resolve({ id: memberId }) });
}
