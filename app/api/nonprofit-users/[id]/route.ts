import { type NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import {
    deleteNonprofitUserDTO,
    getNonprofitUserDTO,
    updateNonprofitUserDTO,
} from "@/app/data/nonprofit-users-dto";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/nonprofit-users/[id]
 * Optional convenience handler — returns a single assignment
 */
export async function GET(req: NextRequest, context: RouteParams) {
    return safeRoute(async () => {
        const { id } = await context.params;
        const data = await getNonprofitUserDTO(id);
        return NextResponse.json(data);
    });
}

/**
 * PATCH /api/nonprofit-users/[id]
 * Body: { role?, board_role? }
 */
export async function PATCH(req: NextRequest, context: RouteParams) {
    return safeRoute(async () => {
        const { id } = await context.params;
        const body = await req.json();
        const updated = await updateNonprofitUserDTO(id, body);
        return NextResponse.json(updated);
    });
}

/**
 * DELETE /api/nonprofit-users/[id]
 */
export async function DELETE(req: NextRequest, context: RouteParams) {
    return safeRoute(async () => {
        const { id } = await context.params;
        await deleteNonprofitUserDTO(id);
        return NextResponse.json({ success: true });
    });
}
