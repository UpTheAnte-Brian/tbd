// CANONICAL (entity UI) - shim that delegates to global governance handler
import {
    DELETE as deleteBoardMember,
    PATCH as patchBoardMember,
} from "@/app/api/governance/board-members/[id]/route";

interface RouteParams {
    params: Promise<{ id: string; memberId: string }>;
}

export async function PATCH(req: Request, context: RouteParams) {
    const { memberId } = await context.params;
    return patchBoardMember(req, { params: Promise.resolve({ id: memberId }) });
}

export async function DELETE(req: Request, context: RouteParams) {
    const { memberId } = await context.params;
    return deleteBoardMember(req, {
        params: Promise.resolve({ id: memberId }),
    });
}
