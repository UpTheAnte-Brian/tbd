import { jsonError, jsonOk, parseEntityId, getServerClient } from "@/app/lib/server/route-context";
import { castVote } from "@/app/data/governance-dto";
import {
    listMotionVotes,
    upsertMyVote,
} from "@/domain/governance/meeting-dto";
import { VOTE_VALUE, type VoteValue } from "@/domain/governance/constants";

interface RouteParams {
    params: Promise<{ id: string; motionId: string }>;
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

function parseVoteValue(value: unknown): VoteValue | null {
    if (typeof value !== "string") return null;
    const normalized = value.toLowerCase();
    return Object.values(VOTE_VALUE).includes(normalized as VoteValue)
        ? (normalized as VoteValue)
        : null;
}

export async function GET(_req: Request, context: RouteParams) {
    try {
        const supabase = await getServerClient();
        const { id, motionId } = await context.params;
        const entityId = await parseEntityId(supabase, { id });
        const votes = await listMotionVotes(entityId, motionId);
        return jsonOk({ votes });
    } catch (err: unknown) {
        return handleRouteError(err);
    }
}

export async function PUT(req: Request, context: RouteParams) {
    try {
        const supabase = await getServerClient();
        const { id, motionId } = await context.params;
        const entityId = await parseEntityId(supabase, { id });

        let body: Record<string, unknown> = {};
        try {
            body = (await req.json()) as Record<string, unknown>;
        } catch {
            return jsonError("Invalid JSON", 400);
        }

        const value = parseVoteValue(body.value);
        if (!value) {
            return jsonError("Invalid vote value", 400);
        }

        const vote = await upsertMyVote(entityId, motionId, value);
        return jsonOk({ vote });
    } catch (err: unknown) {
        return handleRouteError(err);
    }
}

export async function POST(req: Request, context: RouteParams) {
    try {
        const supabase = await getServerClient();
        const { id, motionId } = await context.params;
        await parseEntityId(supabase, { id });

        let body: Record<string, unknown> = {};
        try {
            body = (await req.json()) as Record<string, unknown>;
        } catch {
            return jsonError("Invalid JSON", 400);
        }

        const boardMemberId =
            typeof body.board_member_id === "string"
                ? body.board_member_id.trim()
                : "";
        if (!boardMemberId) {
            return jsonError("board_member_id is required", 400);
        }

        const created = await castVote({
            motion_id: motionId,
            board_member_id: boardMemberId,
            vote:
                typeof body.vote === "string"
                    ? body.vote
                    : VOTE_VALUE.ABSTAIN,
            signed_at:
                typeof body.signed_at === "string"
                    ? body.signed_at
                    : undefined,
        });

        return jsonOk({ vote: created }, { status: 201 });
    } catch (err: unknown) {
        return handleRouteError(err);
    }
}
