import { jsonError, jsonOk, parseEntityId, getServerClient } from "@/app/lib/server/route-context";
import { amendMeetingMinutes } from "@/domain/governance/meeting-dto";

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

export async function POST(req: Request, context: RouteParams) {
    try {
        const supabase = await getServerClient();
        const { id, meetingId } = await context.params;
        const entityId = await parseEntityId(supabase, { id });

        let body: Record<string, unknown> = {};
        try {
            body = (await req.json()) as Record<string, unknown>;
        } catch {
            return jsonError("Invalid JSON", 400);
        }

        const fromMinutesId =
            typeof body.fromMinutesId === "string" ? body.fromMinutesId : "";
        if (!fromMinutesId) {
            return jsonError("fromMinutesId is required", 400);
        }

        const minutes = await amendMeetingMinutes(
            entityId,
            meetingId,
            fromMinutesId,
        );
        return jsonOk({ minutes }, { status: 201 });
    } catch (err: unknown) {
        return handleRouteError(err);
    }
}
