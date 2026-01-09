// DEPRECATED: Prefer /api/entities/[id]/governance/* for entity-scoped workflows.
import { NextResponse } from "next/server";
import {
    createBoardMeeting,
    listBoardMeetings,
} from "@/app/data/governance-dto";
import { safeRoute } from "@/app/lib/api/handler";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";

interface RouteParams {
    params: Promise<{ boardId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { boardId } = await context.params;
        const elevated = await isPlatformAdminServer();
        const meetings = await listBoardMeetings(boardId, { elevated });
        return NextResponse.json(meetings);
    });
}

export async function POST(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { boardId } = await context.params;
        const body = await req.json();
        const elevated = await isPlatformAdminServer();
        const created = await createBoardMeeting(boardId, body, { elevated });
        return NextResponse.json(created, { status: 201 });
    });
}
