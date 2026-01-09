// DEPRECATED: Prefer /api/entities/[id]/governance/* for entity-scoped workflows.
import { NextResponse } from "next/server";
import {
    removeBoardMember,
    updateBoardMember,
} from "@/app/data/governance-dto";
import { safeRoute } from "@/app/lib/api/handler";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { id } = await context.params;
        const body = await req.json();
        const elevated = await isPlatformAdminServer();
        const updated = await updateBoardMember(id, body, { elevated });
        return NextResponse.json(updated);
    });
}

export async function DELETE(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { id } = await context.params;
        const elevated = await isPlatformAdminServer();
        await removeBoardMember(id, { elevated });
        return NextResponse.json({ success: true });
    });
}
