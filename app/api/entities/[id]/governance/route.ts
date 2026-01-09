// CANONICAL (entity UI)
import { NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { getGovernanceSnapshot } from "@/app/data/governance-dto";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const supabase = await createApiClient();
        const { id } = await context.params;
        const entityId = await resolveEntityId(supabase, id);
        const elevated = await isPlatformAdminServer();
        const snapshot = await getGovernanceSnapshot(entityId, { elevated });
        return NextResponse.json(snapshot);
    });
}
