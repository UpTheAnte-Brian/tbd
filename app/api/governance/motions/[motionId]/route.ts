// DEPRECATED: Prefer /api/entities/[id]/governance/* for entity-scoped workflows.
import { NextResponse } from "next/server";
import { getMotion, updateMotion } from "@/app/data/governance-dto";
import { safeRoute } from "@/app/lib/api/handler";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";

interface RouteParams {
    params: Promise<{ motionId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { motionId } = await context.params;
        const elevated = await isPlatformAdminServer();
        const motion = await getMotion(motionId, { elevated });
        return NextResponse.json(motion);
    });
}

export async function PATCH(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { motionId } = await context.params;
        const body = await req.json();
        const elevated = await isPlatformAdminServer();
        const updated = await updateMotion(motionId, body, { elevated });
        return NextResponse.json(updated);
    });
}
