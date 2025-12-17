import { NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { getGovernanceSnapshot } from "@/app/data/governance-dto";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { id } = await context.params;
        const elevated = await isPlatformAdminServer();
        const snapshot = await getGovernanceSnapshot(id, { elevated });
        return NextResponse.json(snapshot);
    });
}
