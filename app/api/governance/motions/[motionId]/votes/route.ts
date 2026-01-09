import { NextResponse } from "next/server";
import { castVote, listVotesByMotionIds } from "@/app/data/governance-dto";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";

interface RouteParams {
    params: Promise<{ motionId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    try {
        const { motionId } = await context.params;
        const elevated = await isPlatformAdminServer();
        const votes = await listVotesByMotionIds([motionId], { elevated });
        return NextResponse.json(votes);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load votes";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function POST(req: Request, context: RouteParams) {
    try {
        const { motionId } = await context.params;
        const body = await req.json();
        const elevated = await isPlatformAdminServer();
        const created = await castVote(
            { ...body, motion_id: motionId },
            { elevated },
        );
        return NextResponse.json(created, { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to cast vote";
        const normalized = message.toLowerCase();
        const status = normalized.includes("voting is closed") ? 400 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
