import { jsonError, jsonOk, parseEntityId, getServerClient } from "@/app/lib/server/route-context";
import { startMeeting } from "@/domain/governance/meeting-dto";

interface RouteParams {
    params: Promise<{ id: string; meetingId: string }>;
}

function handleRouteError(err: unknown) {
    const message = err instanceof Error ? err.message : "Request failed";
    const normalized = message.toLowerCase();
    if (normalized.includes("not authenticated") || normalized.includes("unauthorized")) {
        return jsonError(message, 401);
    }
    if (normalized.includes("not found")) {
        return jsonError(message, 404);
    }
    if (normalized.includes("forbidden") || normalized.includes("not authorized")) {
        return jsonError(message, 403);
    }
    return jsonError(message, 400);
}

export async function POST(_req: Request, context: RouteParams) {
    try {
        const supabase = await getServerClient();
        const { id, meetingId } = await context.params;
        const entityId = await parseEntityId(supabase, { id });
        const meeting = await startMeeting(entityId, meetingId);
        return jsonOk({ meeting });
    } catch (err: unknown) {
        return handleRouteError(err);
    }
}
