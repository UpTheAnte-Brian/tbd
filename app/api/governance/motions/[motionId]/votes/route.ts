import { NextResponse } from "next/server";
import { castVote, listVotesByMotionIds } from "@/app/data/governance-dto";
import { safeRoute } from "@/app/lib/api/handler";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";

interface RouteParams {
    params: Promise<{ motionId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { motionId } = await context.params;
        const elevated = await isPlatformAdminServer();
        const votes = await listVotesByMotionIds([motionId], { elevated });
        return NextResponse.json(votes);
    });
}

export async function POST(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { motionId } = await context.params;
        const body = await req.json();
        const elevated = await isPlatformAdminServer();
        const created = await castVote(
            { ...body, motion_id: motionId },
            { elevated },
        );
        return NextResponse.json(created, { status: 201 });
    });
}
