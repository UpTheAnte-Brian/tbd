// DEPRECATED: Prefer /api/entities/[id]/governance/* for entity-scoped workflows.
import { NextResponse } from "next/server";
import {
    deleteBoardMeeting,
    getBoardMeeting,
    updateBoardMeeting,
} from "@/app/data/governance-dto";
import { safeRoute } from "@/app/lib/api/handler";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";

interface RouteParams {
    params: Promise<{ meetingId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { meetingId } = await context.params;
        const elevated = await isPlatformAdminServer();
        const meeting = await getBoardMeeting(meetingId, { elevated });
        return NextResponse.json(meeting);
    });
}

export async function PATCH(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { meetingId } = await context.params;
        const body = await req.json();
        const elevated = await isPlatformAdminServer();
        const updated = await updateBoardMeeting(meetingId, body, { elevated });
        return NextResponse.json(updated);
    });
}

export async function DELETE(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { meetingId } = await context.params;
        const elevated = await isPlatformAdminServer();
        await deleteBoardMeeting(meetingId, { elevated });
        return NextResponse.json({ success: true });
    });
}
