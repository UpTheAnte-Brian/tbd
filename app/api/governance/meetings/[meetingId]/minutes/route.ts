// DEPRECATED: Prefer /api/entities/[id]/governance/* for entity-scoped workflows.
import { NextResponse } from "next/server";
import {
    listMinutesByMeetingIds,
    saveMinutes,
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
        const minutes = await listMinutesByMeetingIds([meetingId], { elevated });
        return NextResponse.json(minutes);
    });
}

export async function POST(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { meetingId } = await context.params;
        const body = await req.json();
        const elevated = await isPlatformAdminServer();
        const saved = await saveMinutes(
            { ...body, meeting_id: meetingId },
            { elevated },
        );
        return NextResponse.json(saved);
    });
}
