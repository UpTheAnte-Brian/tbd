// CANONICAL (entity UI)
import { safeRoute } from "@/app/lib/api/handler";
import { getGovernanceSnapshot } from "@/app/data/governance-dto";
import {
    getServerClient,
    jsonOk,
    parseEntityId,
} from "@/app/lib/server/route-context";
import { isGlobalAdmin } from "@/app/lib/server/rbac";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    return safeRoute(async () => {
        const supabase = await getServerClient();
        const entityId = await parseEntityId(supabase, context.params);
        const elevated = await isGlobalAdmin(supabase);
        const snapshot = await getGovernanceSnapshot(entityId, { elevated });
        return jsonOk(snapshot);
    });
}
