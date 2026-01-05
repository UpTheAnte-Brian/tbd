import { NextResponse } from "next/server";
import { safeRoute } from "@/app/lib/api/handler";
import { getGovernanceSnapshot } from "@/app/data/governance-dto";
import { getNonprofitDTO } from "@/app/data/nonprofit-dto";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const { id } = await context.params;
        const elevated = await isPlatformAdminServer();
        const nonprofit = await getNonprofitDTO(id);

        // Governance is keyed by entity_id; nonprofit.id is not an entities.id
        if (!nonprofit?.entity_id) {
            throw new Error(`Nonprofit ${id} is missing entity_id`);
        }

        const snapshot = await getGovernanceSnapshot(nonprofit.entity_id, {
            elevated,
        });
        return NextResponse.json(snapshot);
    });
}
