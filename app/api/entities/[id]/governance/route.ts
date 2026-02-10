// CANONICAL (entity UI)
import { safeRoute } from "@/app/lib/api/handler";
import { getGovernanceSnapshot } from "@/domain/governance/governance-dto";
import {
    getServerClient,
    jsonOk,
    parseEntityId,
} from "@/app/lib/server/route-context";
import { isGlobalAdmin } from "@/app/lib/server/rbac";
import type { GovernanceSnapshot } from "@/domain/governance/governance";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const supabase = await getServerClient();
        const entityId = await parseEntityId(supabase, context.params);
        const elevated = await isGlobalAdmin(supabase);
        try {
            const snapshot = await getGovernanceSnapshot(entityId, { elevated });
            return jsonOk(snapshot);
        } catch (err: unknown) {
            if (isPermissionDenied(err)) {
                return jsonOk(buildEmptySnapshot(entityId));
            }
            throw err;
        }
    });
}

function isPermissionDenied(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const code = (err as { code?: string }).code;
    return code === "42501";
}

function buildEmptySnapshot(entityId: string): GovernanceSnapshot {
    return {
        board: {
            id: "",
            name: "",
            entity_id: entityId,
        },
        members: [],
        meetings: [],
        motions: [],
        votes: [],
        minutes: [],
        approvals: [],
        attendance: [],
        boardPacketsByMeetingId: {},
    };
}
