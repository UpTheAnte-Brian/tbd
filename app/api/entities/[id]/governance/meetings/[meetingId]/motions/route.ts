import { jsonError, jsonOk, parseEntityId, getServerClient } from "@/app/lib/server/route-context";
import { createMotion } from "@/app/data/governance-dto";
import {
    createMeetingMotion,
    getMeetingDetail,
    listMeetingMotions,
} from "@/domain/governance/meeting-dto";
import {
    MOTION_STATUS,
    type MotionStatus,
} from "@/domain/governance/constants";

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

export async function GET(_req: Request, context: RouteParams) {
    try {
        const supabase = await getServerClient();
        const { id, meetingId } = await context.params;
        const entityId = await parseEntityId(supabase, { id });
        const motions = await listMeetingMotions(entityId, meetingId);
        return jsonOk({ motions });
    } catch (err: unknown) {
        return handleRouteError(err);
    }
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

        const title =
            typeof body.title === "string" ? body.title.trim() : "";
        if (!title) {
            return jsonError("title is required", 400);
        }

        const usesLegacyFields =
            typeof body.moved_by === "string" ||
            typeof body.motion_type === "string" ||
            typeof body.description === "string" ||
            typeof body.seconded_by === "string";

        if (usesLegacyFields) {
            await getMeetingDetail(entityId, meetingId);
            const created = await createMotion({
                meeting_id: meetingId,
                motion_type:
                    typeof body.motion_type === "string"
                        ? body.motion_type
                        : undefined,
                title,
                description:
                    typeof body.description === "string"
                        ? body.description
                        : undefined,
                moved_by:
                    typeof body.moved_by === "string"
                        ? body.moved_by
                        : undefined,
                seconded_by:
                    typeof body.seconded_by === "string"
                        ? body.seconded_by
                        : undefined,
                status:
                    typeof body.status === "string"
                        ? body.status
                        : undefined,
            });

            const motion = {
                id: created.id,
                meeting_id: created.meeting_id,
                entity_id: entityId,
                title: created.title ?? title,
                status:
                    (created.status as MotionStatus | null | undefined) ??
                        MOTION_STATUS.PENDING,
                created_at: created.created_at ?? new Date().toISOString(),
                finalized_at: created.finalized_at ?? null,
            };

            return jsonOk({ motion }, { status: 201 });
        }

        const motion = await createMeetingMotion(entityId, meetingId, title);
        return jsonOk({ motion }, { status: 201 });
    } catch (err: unknown) {
        return handleRouteError(err);
    }
}
